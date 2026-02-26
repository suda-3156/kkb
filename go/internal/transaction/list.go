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

type Filter struct {
	PublicIDs []pulid.ID
	// IDs is used for dataloader
	IDs []int

	First  *int32
	After  *pulid.ID
	Last   *int32
	Before *pulid.ID

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

	scanDesc := false
	query := m.db.Client.Transaction.Query().
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		})

	query, scanDesc = m.applyFilter(filter, query)

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

func (m *TransactionManager) applyFilter(
	filter *Filter,
	query *ent.TransactionQuery,
) (*ent.TransactionQuery, bool) {
	var scanDesc = false

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

	if filter.After != nil {
		query = query.Where(transaction.PublicIDGT(*filter.After))
	}

	if filter.Before != nil {
		query = query.Where(transaction.PublicIDLT(*filter.Before))
		scanDesc = true
	}

	if filter.First != nil {
		query = query.Limit(int(*filter.First))
	}

	if filter.Last != nil {
		query = query.Limit(int(*filter.Last))
		scanDesc = true
	}

	if scanDesc {
		query = query.Order(ent.Desc(transaction.FieldPublicID))
	} else {
		query = query.Order(ent.Asc(transaction.FieldPublicID))
	}

	return query, scanDesc
}

func (m *TransactionManager) getPageInfo(
	ctx context.Context,
	txns []*ent.Transaction,
) (hasPrevPage, hasNextPage bool, err error) {
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
