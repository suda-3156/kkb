package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	entsql "entgo.io/ent/dialect/sql"
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
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.unarchiveTx(ctx, client, id)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (m *LedgerAccountManager) unarchiveTx(
	ctx context.Context,
	client *ent.Client,
	id pulid.ID,
) (*graph.LedgerAccount, error) {
	// Get the account to unarchive, locking the row.
	account, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(id)).
		WithEncryptionKey().
		ForUpdate(entsql.WithLockAction(entsql.NoWait)).
		Only(ctx)
	if err != nil {
		if ent.IsLockNoWaitError(err) {
			return nil, apperr.NewConflictError(
				fmt.Errorf("ledger account is currently being modified, please try again"),
			)
		}
		if ent.IsNotFound(err) {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("ledger account not found"),
			)
		}
		return nil, apperr.NewInternalServerError(err)
	}

	// If the account has a parent, lock the parent row and check if it is archived.
	// Locking the parent prevents a concurrent archive of the parent from racing with this unarchive.
	parent, err := account.QueryParent().
		ForUpdate(entsql.WithLockAction(entsql.NoWait)).
		Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		if ent.IsLockNoWaitError(err) {
			return nil, apperr.NewConflictError(
				fmt.Errorf("parent ledger account is currently being modified, please try again"),
			)
		}
		return nil, apperr.NewInternalServerError(err)
	}
	if parent != nil && parent.ArchivedAt != nil {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("cannot unarchive an account whose parent is archived"),
		)
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
