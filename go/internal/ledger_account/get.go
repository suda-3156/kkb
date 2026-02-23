package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/internal/error"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *LedgerAccountManager) GetByPublicID(
	ctx context.Context,
	publicID pulid.ID,
) (*graph.LedgerAccount, error) {
	slog.DebugContext(
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
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found: %w", err),
			)
		}

		return nil, apperr.NewInternalServerError(err)
	}

	return m.convertToGraph(ctx, account)
}

func (m *LedgerAccountManager) GetByInternalID(
	ctx context.Context,
	ID int,
) (*graph.LedgerAccount, error) {
	slog.DebugContext(
		ctx,
		"ledger account - get by internal ID called",
		slog.Int("internal_id", ID),
	)

	account, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.ID(ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found: %w", err),
			)
		}

		return nil, apperr.NewInternalServerError(err)
	}

	return m.convertToGraph(ctx, account)
}
