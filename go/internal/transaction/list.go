package transaction

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/predicate"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/cursor"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
)

const (
	// defaultPageSize applies when the caller specifies neither first nor last.
	defaultPageSize = 20
	// maxPageSize bounds a single page. Every row carries eagerly loaded
	// journal entries and a description that has to be decrypted, so an
	// unbounded page is expensive well before the response size matters.
	maxPageSize = 100
)

type Filter struct {
	First  *int32
	After  *cursor.Cursor
	Last   *int32
	Before *cursor.Cursor
	Order  graph.TransactionOrder

	StartDate *date.Date
	EndDate   *date.Date
}

// page is the resolved pagination request: how many rows to read and which end
// of the ordering to read them from.
type page struct {
	limit int
	// reverse scans from the opposite end, which is how `last` is served. The
	// rows come back in reverse order and are flipped before conversion.
	reverse bool
}

// scope holds the decoded boundary cursors so they are parsed once per request.
type scope struct {
	after  *transactionCursor
	before *transactionCursor
}

func (m *TransactionManager) List(
	ctx context.Context,
	filter *Filter,
) (*graph.TransactionConnection, error) {
	logging.Debug(
		ctx,
		"transaction - list called",
	)

	page, err := resolvePage(filter)
	if err != nil {
		return nil, err
	}

	s, err := decodeScope(filter)
	if err != nil {
		return nil, fmt.Errorf("list: decode scope: %w", err)
	}

	order, err := orderOptions(filter.Order, page.reverse)
	if err != nil {
		return nil, fmt.Errorf("list: order: %w", err)
	}

	query := m.db.Client.Transaction.Query().
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		})
	query = applyBaseFilter(filter, query)
	query = applyScope(s, query)
	query = query.Limit(page.limit).Order(order...)

	txns, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list: query: %w", err)
	}

	if page.reverse {
		reverseTransactions(txns)
	}

	hasPrevPage, hasNextPage, err := m.getPageInfo(ctx, filter, s, txns)
	if err != nil {
		return nil, fmt.Errorf("list: page info: %w", err)
	}

	return m.convertToGraphConnection(ctx, txns, filter.Order, hasPrevPage, hasNextPage)
}

// resolvePage validates the pagination arguments and settles the page size.
// GraphQL cannot express "exactly one of first or last", so the rule lives here.
func resolvePage(filter *Filter) (page, error) {
	if filter == nil {
		return page{}, fmt.Errorf("%w: transaction filter is required", ErrInvalidPagination)
	}
	if !filter.Order.IsValid() {
		return page{}, fmt.Errorf("%w: transaction order is required", ErrInvalidPagination)
	}
	if filter.First != nil && filter.Last != nil {
		return page{}, fmt.Errorf("%w: first and last cannot be combined", ErrInvalidPagination)
	}

	size := int32(defaultPageSize)
	reverse := false
	switch {
	case filter.First != nil:
		size = *filter.First
	case filter.Last != nil:
		size = *filter.Last
		reverse = true
	}

	if size <= 0 || size > maxPageSize {
		return page{}, fmt.Errorf(
			"%w: page size must be between 1 and %d", ErrInvalidPagination, maxPageSize,
		)
	}

	return page{limit: int(size), reverse: reverse}, nil
}

func decodeScope(filter *Filter) (*scope, error) {
	result := &scope{}

	if filter.After != nil {
		decoded, err := decodeTransactionCursor(*filter.After, filter.Order)
		if err != nil {
			return nil, fmt.Errorf("after: %w", err)
		}
		result.after = &decoded
	}

	if filter.Before != nil {
		decoded, err := decodeTransactionCursor(*filter.Before, filter.Order)
		if err != nil {
			return nil, fmt.Errorf("before: %w", err)
		}
		result.before = &decoded
	}

	return result, nil
}

func applyScope(s *scope, query *ent.TransactionQuery) *ent.TransactionQuery {
	if s.after != nil {
		query = query.Where(afterPredicate(s.after))
	}
	if s.before != nil {
		query = query.Where(beforePredicate(s.before))
	}
	return query
}

func applyBaseFilter(filter *Filter, query *ent.TransactionQuery) *ent.TransactionQuery {
	if filter.StartDate != nil {
		query = query.Where(transaction.DateGTE(*filter.StartDate))
	}
	if filter.EndDate != nil {
		query = query.Where(transaction.DateLTE(*filter.EndDate))
	}
	return query
}

func orderOptions(order graph.TransactionOrder, reverse bool) ([]transaction.OrderOption, error) {
	switch order {
	case graph.TransactionOrderTransactionDateDesc:
		if reverse {
			return []transaction.OrderOption{
				ent.Asc(transaction.FieldDate),
				ent.Asc(transaction.FieldCreatedAt),
				ent.Desc(transaction.FieldPublicID),
			}, nil
		}
		return []transaction.OrderOption{
			ent.Desc(transaction.FieldDate),
			ent.Desc(transaction.FieldCreatedAt),
			ent.Asc(transaction.FieldPublicID),
		}, nil
	case graph.TransactionOrderCreatedAtDesc:
		if reverse {
			return []transaction.OrderOption{
				ent.Asc(transaction.FieldCreatedAt),
				ent.Desc(transaction.FieldPublicID),
			}, nil
		}
		return []transaction.OrderOption{
			ent.Desc(transaction.FieldCreatedAt),
			ent.Asc(transaction.FieldPublicID),
		}, nil
	default:
		return nil, fmt.Errorf("%w: unknown transaction order %q", ErrInvalidPagination, order)
	}
}

func afterPredicate(c *transactionCursor) predicate.Transaction {
	createdAfter := transaction.Or(
		transaction.CreatedAtLT(c.CreatedAt),
		transaction.And(
			transaction.CreatedAtEQ(c.CreatedAt),
			transaction.PublicIDGT(c.PublicID),
		),
	)
	if c.Order == graph.TransactionOrderCreatedAtDesc {
		return createdAfter
	}
	return transaction.Or(
		transaction.DateLT(c.Date),
		transaction.And(
			transaction.DateEQ(c.Date),
			createdAfter,
		),
	)
}

func beforePredicate(c *transactionCursor) predicate.Transaction {
	createdBefore := transaction.Or(
		transaction.CreatedAtGT(c.CreatedAt),
		transaction.And(
			transaction.CreatedAtEQ(c.CreatedAt),
			transaction.PublicIDLT(c.PublicID),
		),
	)
	if c.Order == graph.TransactionOrderCreatedAtDesc {
		return createdBefore
	}
	return transaction.Or(
		transaction.DateGT(c.Date),
		transaction.And(
			transaction.DateEQ(c.Date),
			createdBefore,
		),
	)
}

func (m *TransactionManager) getPageInfo(
	ctx context.Context,
	filter *Filter,
	s *scope,
	txns []*ent.Transaction,
) (hasPrevPage, hasNextPage bool, err error) {
	prevPredicate, nextPredicate := pageInfoPredicates(filter.Order, s, txns)

	if prevPredicate != nil {
		hasPrevPage, err = applyBaseFilter(filter, m.db.Client.Transaction.Query()).
			Where(prevPredicate).Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("check hasPreviousPage: %w", err)
		}
	}

	if nextPredicate != nil {
		hasNextPage, err = applyBaseFilter(filter, m.db.Client.Transaction.Query()).
			Where(nextPredicate).Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("check hasNextPage: %w", err)
		}
	}

	return hasPrevPage, hasNextPage, nil
}

// pageInfoPredicates returns what to look for on either side of the page. A nil
// predicate means that side cannot exist and no query is needed.
func pageInfoPredicates(
	order graph.TransactionOrder,
	s *scope,
	txns []*ent.Transaction,
) (prev, next predicate.Transaction) {
	if len(txns) > 0 {
		startCursor := newTransactionCursor(txns[0], order)
		endCursor := newTransactionCursor(txns[len(txns)-1], order)
		return beforePredicate(&startCursor), afterPredicate(&endCursor)
	}

	// The page is empty, so there is no row to anchor on. Fall back to the
	// requested boundaries: everything that is not strictly after `after` sits
	// on the previous side, and everything not strictly before `before` sits on
	// the next side. Without either boundary the result set itself is empty and
	// neither side exists.
	if s.after != nil {
		prev = transaction.Not(afterPredicate(s.after))
	}
	if s.before != nil {
		next = transaction.Not(beforePredicate(s.before))
	}
	return prev, next
}

func reverseTransactions(txns []*ent.Transaction) {
	for i, j := 0, len(txns)-1; i < j; i, j = i+1, j-1 {
		txns[i], txns[j] = txns[j], txns[i]
	}
}
