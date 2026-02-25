package transaction

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) List(
	ctx context.Context,
	first *int32,
	publicIDs []pulid.ID,
	IDs []int,
	after *pulid.ID,
	last *int32,
	before *pulid.ID,
	startDate *date.Date,
	endDate *date.Date,
) (*graph.TransactionConnection, error) {
	logging.Debug(
		ctx,
		"transaction - list called",
	)

	scanDesc := false
	query := m.db.Client.Transaction.Query().
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		})

	// NOTE: Date field is encrypted and cannot be filtered in SQL.
	// Cursor-based pagination is applied only when no date filter is specified.
	// When date filters are present, all records are fetched and filtered in memory.
	applyCursor := startDate == nil && endDate == nil

	if len(publicIDs) > 0 {
		query = query.Where(transaction.PublicIDIn(publicIDs...))
	}

	if len(IDs) > 0 {
		query = query.Where(transaction.IDIn(IDs...))
	}

	if applyCursor {
		if after != nil {
			query = query.Where(transaction.PublicIDGT(*after))
		}

		if before != nil {
			query = query.Where(transaction.PublicIDLT(*before))
			scanDesc = true
		}

		if first != nil {
			query = query.Limit(int(*first))
		}

		if last != nil {
			query = query.Limit(int(*last))
			scanDesc = true
		}
	}

	if scanDesc {
		query = query.Order(ent.Desc(transaction.FieldPublicID))
	} else {
		query = query.Order(ent.Asc(transaction.FieldPublicID))
	}

	txns, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list: query: %w", err)
	}

	if scanDesc {
		for i, j := 0, len(txns)-1; i < j; i, j = i+1, j-1 {
			txns[i], txns[j] = txns[j], txns[i]
		}
	}

	// Apply in-memory date filtering when requested.
	// TODO: For large datasets, consider storing date in a sortable plaintext column.
	if startDate != nil || endDate != nil {
		filtered := txns[:0]
		for _, txn := range txns {
			keyID := txn.Edges.EncryptionKey.ID
			dateStr, err := m.em.Decrypt(ctx, txn.Date, keyID)
			if err != nil {
				return nil, fmt.Errorf("list: decrypt date: %w", err)
			}
			d, err := date.NewDate(dateStr)
			if err != nil {
				return nil, fmt.Errorf("list: parse date: %w", err)
			}
			if startDate != nil && d.String() < startDate.String() {
				continue
			}
			if endDate != nil && d.String() > endDate.String() {
				continue
			}
			filtered = append(filtered, txn)
		}
		txns = filtered
	}

	hasPrevPage, hasNextPage, err := m.getPageInfo(ctx, txns)
	if err != nil {
		return nil, fmt.Errorf("list: page info: %w", err)
	}

	return m.convertToGraphConnection(ctx, txns, hasPrevPage, hasNextPage)
}

func (m *TransactionManager) getPageInfo(
	ctx context.Context,
	txns []*ent.Transaction,
) (hasPrevPage bool, hasNextPage bool, err error) {
	if len(txns) > 0 {
		startCursor := txns[0].PublicID
		endCursor := txns[len(txns)-1].PublicID

		hasPrevPage, err = m.db.Client.Transaction.Query().
			Where(transaction.PublicIDLT(startCursor)).
			Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("list: check hasPreviousPage: %w", err)
		}

		hasNextPage, err = m.db.Client.Transaction.Query().
			Where(transaction.PublicIDGT(endCursor)).
			Exist(ctx)
		if err != nil {
			return false, false, fmt.Errorf("list: check hasNextPage: %w", err)
		}
	}

	return hasPrevPage, hasNextPage, nil
}
