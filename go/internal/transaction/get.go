package transaction

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func (m *TransactionManager) GetByPublicID(
	ctx context.Context,
	publicID prid.ID,
) (*graph.Transaction, error) {
	logging.Debug(
		ctx,
		"transaction - get by public ID called",
		slog.String("public_id", publicID.String()),
	)

	txn, err := m.db.Client.Transaction.Query().
		Where(transaction.PublicID(publicID)).
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		}).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrTransactionNotFound
		}
		return nil, fmt.Errorf("get by public id: %w", err)
	}

	return m.convertToGraph(ctx, txn)
}

func (m *TransactionManager) GetByInternalID(
	ctx context.Context,
	id int,
) (*graph.Transaction, error) {
	logging.Debug(
		ctx,
		"transaction - get by internal ID called",
		slog.Int("internal_id", id),
	)

	txn, err := m.db.Client.Transaction.Query().
		Where(transaction.ID(id)).
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		}).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrTransactionNotFound
		}
		return nil, fmt.Errorf("get by internal id: %w", err)
	}

	return m.convertToGraph(ctx, txn)
}
