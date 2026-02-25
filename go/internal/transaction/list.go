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

	if len(publicIDs) > 0 {
		query = query.Where(transaction.PublicIDIn(publicIDs...))
	}

	if len(IDs) > 0 {
		query = query.Where(transaction.IDIn(IDs...))
	}

	if startDate != nil {
		query = query.Where(transaction.DateGTE(*startDate))
	}

	if endDate != nil {
		query = query.Where(transaction.DateLTE(*endDate))
	}

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
