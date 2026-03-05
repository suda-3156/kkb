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

// Unarchive unarchives a ledger account only if its parent account is not archived.
// It does not unarchive descendant accounts.
func (m *LedgerAccountManager) Unarchive(
	ctx context.Context,
	id prid.ID,
) (*graph.LedgerAccount, error) {
	logging.Debug(
		ctx,
		"ledger account - unarchive called",
		slog.String("public_id", id.String()),
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.unarchiveTx(ctx, client, id)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("unarchive: %w", err)
	}

	return account, nil
}

func (m *LedgerAccountManager) unarchiveTx(
	ctx context.Context,
	client *ent.Client,
	id prid.ID,
) (*graph.LedgerAccount, error) {
	// Get the account to unarchive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		WithEncryptionKey().
		WithParent().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}

		return nil, fmt.Errorf("unarchive: query account: %w", err)
	}

	// If the account has a parent, check if the parent is archived.
	if account.Edges.Parent != nil {
		if account.Edges.Parent.ArchivedAt != nil {
			return nil, ErrParentIsArchivedOnUnarchive
		}
	}

	// Unarchive the account by setting ArchivedAt to null.
	if err := client.LedgerAccount.Update().
		Where(ledgeraccount.ID(account.ID)).
		SetNillableArchivedAt(nil).
		Exec(ctx); err != nil {
		return nil, fmt.Errorf("unarchive: clear archived_at: %w", err)
	}

	return m.convertToGraph(ctx, account)
}
