package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func (m *LedgerAccountManager) GetByPublicID(
	ctx context.Context,
	publicID prid.ID,
) (*graph.LedgerAccount, error) {
	logging.Debug(
		ctx,
		"ledger account - get by public ID called",
		slog.String("public_id", publicID.String()),
	)

	// Get the account from the database.
	account, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(publicID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}

		return nil, fmt.Errorf("get by public id: %w", err)
	}

	return m.convertToGraph(ctx, account)
}

func (m *LedgerAccountManager) GetByInternalID(
	ctx context.Context,
	id int,
) (*graph.LedgerAccount, error) {
	logging.Debug(
		ctx,
		"ledger account - get by internal ID called",
		slog.Int("internal_id", id),
	)

	account, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.ID(id)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}

		return nil, fmt.Errorf("get by internal id: %w", err)
	}

	return m.convertToGraph(ctx, account)
}
