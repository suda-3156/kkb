package transaction

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func (m *TransactionManager) Delete(
	ctx context.Context,
	publicID prid.ID,
) (*graph.DeleteTransactionPayload, error) {
	logging.Debug(
		ctx,
		"transaction - delete called",
		slog.String("public_id", publicID.String()),
	)

	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		errTx = m.deleteTx(ctx, client, publicID)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("delete: %w", err)
	}

	return &graph.DeleteTransactionPayload{Success: true}, nil
}

func (m *TransactionManager) deleteTx(
	ctx context.Context,
	client *ent.Client,
	publicID prid.ID,
) error {
	txn, err := client.Transaction.Query().
		Where(transaction.PublicID(publicID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return ErrTransactionNotFound
		}
		return fmt.Errorf("delete: query transaction: %w", err)
	}

	// Delete associated journal entries first.
	_, err = client.JournalEntry.Delete().
		Where(journalentry.HasTransactionWith(transaction.ID(txn.ID))).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("delete: delete journal entries: %w", err)
	}

	// Delete the transaction.
	if err := client.Transaction.DeleteOne(txn).Exec(ctx); err != nil {
		return fmt.Errorf("delete: delete transaction: %w", err)
	}

	return nil
}
