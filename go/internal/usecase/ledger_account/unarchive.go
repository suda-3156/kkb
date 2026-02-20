package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	apperr "github.com/suda-3156/kkb/go/pkg/error"
	"github.com/suda-3156/kkb/go/pkg/pulid"
)

// Unarchive unarchives a ledger account only if its parent account is not archived.
// It does not unarchive descendant accounts.
func (u *UseCase) Unarchive(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Unarchive: started",
		slog.String("public_id", id.String()),
	)

	var account *graph.LedgerAccount
	var errTx error
	if err := u.db.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = u.unarchiveTx(ctx, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Unarchive: completed",
		slog.String("public_id", id.String()),
	)

	return account, nil
}

func (u *UseCase) unarchiveTx(
	ctx context.Context,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := u.db
	tx := u.db.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	// Get the account to unarchive.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
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
		SetArchivedAt(nil).
		Exec(ctx); err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return u.convertToGraph(ctx, account)
}
