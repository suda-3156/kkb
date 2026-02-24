package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	entsql "entgo.io/ent/dialect/sql"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	apperr "github.com/suda-3156/kkb/go/internal/error"
)

func (m *LedgerAccountManager) Update(
	ctx context.Context,
	input graph.UpdateLedgerAccountInput,
) (*graph.LedgerAccount, error) {
	// Check if the input is valid.
	if input.ParentID != nil && *input.ParentID == input.ID {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("cannot set itself as parent"),
		)
	}

	if input.ParentID != nil && input.UnsetParent == true {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("cannot set and unset parent at the same time"),
		)
	}

	if input.Name != nil && len(*input.Name) > 100 {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("name must be at most 100 characters"),
		)
	}

	// Encrypt
	var encrypted *encryption.EncryptionPayload
	var err error
	if input.Name != nil {
		encrypted, err = m.em.Encrypt(ctx, *input.Name)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}
	}

	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.updateTx(ctx, client, input, encrypted)
		return errTx
	}); err != nil {
		return nil, err
	}

	slog.InfoContext(
		ctx,
		"Ledger Account Service - Update: completed",
		slog.String("public_id", input.ID.String()),
	)

	return account, nil
}

func (m *LedgerAccountManager) updateTx(
	ctx context.Context,
	client *ent.Client,
	input graph.UpdateLedgerAccountInput,
	encryptedName *encryption.EncryptionPayload,
) (*graph.LedgerAccount, error) {
	// Get the existing ledger account, locking the row.
	existing, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(input.ID)).
		WithEncryptionKey().
		WithParent().
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

	// Check for optimistic locking
	if !existing.UpdatedAt.Equal(input.UpdatedAt) {
		return nil, apperr.NewConflictError(
			fmt.Errorf("ledger account has been modified by another process"),
		)
	}

	// Check parent account if parent ID is provided
	var parent *ent.LedgerAccount = nil
	if input.ParentID != nil {
		// Lock the new parent row to prevent concurrent archive/modification.
		parent, err = client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(*input.ParentID)).
			ForUpdate(entsql.WithLockAction(entsql.NoWait)).
			Only(ctx)
		if err != nil {
			if ent.IsLockNoWaitError(err) {
				return nil, apperr.NewConflictError(
					fmt.Errorf("parent ledger account is currently being modified, please try again"),
				)
			}
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("parent ledger account not found"),
			)
		}

		if parent.ArchivedAt != nil {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("cannot set archived ledger account as parent"),
			)
		}

		if !parent.IsGroup {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("cannot set non-group ledger account as parent"),
			)
		}

		if parent.Kind != existing.Kind {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("parent ledger account must be of the same kind"),
			)
		}
	}

	// Check isGroup can be changed if provided
	if input.IsGroup != nil && *input.IsGroup != existing.IsGroup {
		if !existing.IsGroup {
			// If changing from non-group to group, ensure it has no journal entries
			// TODO: Implement check for journal entries using this account
		} else {
			// If changing from group to non-group, ensure it has no child accounts
			count, err := existing.QueryChildren().Count(ctx)
			if err != nil {
				return nil, apperr.NewInternalServerError(err)
			}
			if count > 0 {
				return nil, apperr.NewBadRequestError(
					fmt.Errorf("cannot change to group account while it has child accounts"),
				)
			}
		}
	}

	// Update the ledger account
	query := existing.Update().
		SetNillableIsGroup(input.IsGroup)

	if parent != nil {
		query = query.SetParentID(parent.ID)
	}

	if input.UnsetParent {
		query = query.ClearParent()
	}

	if input.Name != nil {
		query = query.SetAccountName(encryptedName.Ciphertext).
			SetEncryptionKeyID(encryptedName.KeyID)
	}

	updated, err := query.Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	// Reload with EncryptionKey edge (Save does not populate edges)
	updated, err = client.LedgerAccount.Query().
		Where(ledgeraccount.ID(updated.ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return m.convertToGraph(ctx, updated)
}
