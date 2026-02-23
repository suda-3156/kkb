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

// Unarchive unarchives a ledger account only if its parent account is not archived.
// It does not unarchive descendant accounts.
func (m *LedgerAccountManager) Unarchive(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	slog.DebugContext(
		ctx,
		"ledger account - unarchive called",
		slog.String("public_id", id.String()),
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = m.unarchiveTx(ctx, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (m *LedgerAccountManager) unarchiveTx(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := m.db.Client
	tx := client.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	// Get the account to unarchive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		WithEncryptionKey().
		WithParent().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found"),
			)
		}

		return nil, apperr.NewInternalServerError(err)
	}

	// If the account has a parent, check if the parent is archived.
	if account.Edges.Parent != nil {
		if account.Edges.Parent.ArchivedAt != nil {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("cannot unarchive an account whose parent is archived"),
			)
		}
	}

	// Unarchive the account by setting ArchivedAt to null.
	if err := client.LedgerAccount.Update().
		Where(ledgeraccount.ID(account.ID)).
		SetNillableArchivedAt(nil).
		Exec(ctx); err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return m.convertToGraph(ctx, account)
}
