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
	"github.com/suda-3156/kkb/go/internal/prid"
)

type Filter struct {
	PublicIDs []prid.ID
	// IDs is used for dataloader.
	IDs []int

	First  *int32
	After  *cursor.Cursor
	Last   *int32
	Before *cursor.Cursor
	Order  graph.TransactionOrder

	StartDate *date.Date
	EndDate   *date.Date
}

func (m *TransactionManager) List(
	ctx context.Context,
	filter *Filter,
) (*graph.TransactionConnection, error) {
	logging.Debug(
		ctx,
		"transaction - list called",
	)

	if err := validatePagination(filter); err != nil {
		return nil, err
	}

	query := m.db.Client.Transaction.Query().
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		})

	query, err := applyScope(filter, query)
	if err != nil {
		return nil, fmt.Errorf("list: apply scope: %w", err)
	}

	scanReverse := filter.Last != nil
	if filter.First != nil {
		query = query.Limit(int(*filter.First))
	} else {
		query = query.Limit(int(*filter.Last))
	}
	query = query.Order(orderOptions(filter.Order, scanReverse)...)

	txns, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list: query: %w", err)
	}

	if scanReverse {
		reverseTransactions(txns)
	}

	hasPrevPage, hasNextPage, err := m.getPageInfo(ctx, filter, txns)
	if err != nil {
		return nil, fmt.Errorf("list: page info: %w", err)
	}

	return m.convertToGraphConnection(ctx, txns, filter.Order, hasPrevPage, hasNextPage)
}

func validatePagination(filter *Filter) error {
	if filter == nil {
		return fmt.Errorf("%w: transaction filter is required", ErrInvalidPagination)
	}
	if !filter.Order.IsValid() {
		return fmt.Errorf("%w: transaction order is required", ErrInvalidPagination)
	}
	if (filter.First == nil) == (filter.Last == nil) {
		return fmt.Errorf("%w: exactly one of first or last is required", ErrInvalidPagination)
	}
	if filter.First != nil && *filter.First <= 0 {
		return fmt.Errorf("%w: first must be positive", ErrInvalidPagination)
	}
	if filter.Last != nil && *filter.Last <= 0 {
		return fmt.Errorf("%w: last must be positive", ErrInvalidPagination)
	}
	return nil
}

func applyScope(filter *Filter, query *ent.TransactionQuery) (*ent.TransactionQuery, error) {
	query = applyBaseFilter(filter, query)

	if filter.After != nil {
		decoded, err := decodeTransactionCursor(*filter.After, filter.Order)
		if err != nil {
			return nil, fmt.Errorf("after: %w", err)
		}
		query = query.Where(afterPredicate(&decoded))
	}

	if filter.Before != nil {
		decoded, err := decodeTransactionCursor(*filter.Before, filter.Order)
		if err != nil {
			return nil, fmt.Errorf("before: %w", err)
		}
		query = query.Where(beforePredicate(&decoded))
	}

	return query, nil
}

func applyBaseFilter(filter *Filter, query *ent.TransactionQuery) *ent.TransactionQuery {
	if len(filter.PublicIDs) > 0 {
		query = query.Where(transaction.PublicIDIn(filter.PublicIDs...))
	}
	if len(filter.IDs) > 0 {
		query = query.Where(transaction.IDIn(filter.IDs...))
	}
	if filter.StartDate != nil {
		query = query.Where(transaction.DateGTE(*filter.StartDate))
	}
	if filter.EndDate != nil {
		query = query.Where(transaction.DateLTE(*filter.EndDate))
	}
	return query
}

func orderOptions(order graph.TransactionOrder, reverse bool) []transaction.OrderOption {
	switch order {
	case graph.TransactionOrderTransactionDateDesc:
		if reverse {
			return []transaction.OrderOption{
				ent.Asc(transaction.FieldDate),
				ent.Asc(transaction.FieldCreatedAt),
				ent.Desc(transaction.FieldPublicID),
			}
		}
		return []transaction.OrderOption{
			ent.Desc(transaction.FieldDate),
			ent.Desc(transaction.FieldCreatedAt),
			ent.Asc(transaction.FieldPublicID),
		}
	case graph.TransactionOrderCreatedAtDesc:
		if reverse {
			return []transaction.OrderOption{
				ent.Asc(transaction.FieldCreatedAt),
				ent.Desc(transaction.FieldPublicID),
			}
		}
		return []transaction.OrderOption{
			ent.Desc(transaction.FieldCreatedAt),
			ent.Asc(transaction.FieldPublicID),
		}
	default:
		panic("invalid transaction order")
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
	txns []*ent.Transaction,
) (hasPrevPage, hasNextPage bool, err error) {
	if len(txns) == 0 {
		return false, false, nil
	}

	startCursor := newTransactionCursor(txns[0], filter.Order)
	endCursor := newTransactionCursor(txns[len(txns)-1], filter.Order)

	previousQuery := applyBaseFilter(filter, m.db.Client.Transaction.Query())
	hasPrevPage, err = previousQuery.Where(beforePredicate(&startCursor)).Exist(ctx)
	if err != nil {
		return false, false, fmt.Errorf("check hasPreviousPage: %w", err)
	}

	nextQuery := applyBaseFilter(filter, m.db.Client.Transaction.Query())
	hasNextPage, err = nextQuery.Where(afterPredicate(&endCursor)).Exist(ctx)
	if err != nil {
		return false, false, fmt.Errorf("check hasNextPage: %w", err)
	}

	return hasPrevPage, hasNextPage, nil
}

func reverseTransactions(txns []*ent.Transaction) {
	for i, j := 0, len(txns)-1; i < j; i, j = i+1, j-1 {
		txns[i], txns[j] = txns[j], txns[i]
	}
}
