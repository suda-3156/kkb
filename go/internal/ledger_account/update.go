package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/logging"
)

func (m *LedgerAccountManager) Update(
	ctx context.Context,
	input graph.UpdateLedgerAccountInput,
) (*graph.LedgerAccount, error) {
	// Check if the input is valid.
	if input.ParentID != nil && *input.ParentID == input.ID {
		return nil, ErrCannotSetSelfAsParent
	}

	if input.ParentID != nil && input.UnsetParent == true {
		return nil, ErrConflictingParentOps
	}

	if input.Name != nil && len(*input.Name) > 100 {
		return nil, ErrNameTooLong
	}

	// Encrypt
	var encrypted *encryption.EncryptionPayload
	var err error
	if input.Name != nil {
		encrypted, err = m.em.Encrypt(ctx, *input.Name)
		if err != nil {
			return nil, fmt.Errorf("update: encrypt name: %w", err)
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

	logging.Info(
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
	encrypted *encryption.EncryptionPayload,
) (*graph.LedgerAccount, error) {
	// Get the existing ledger account
	existing, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(input.ID)).
		WithEncryptionKey().
		WithParent().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrAccountNotFound
		}

		return nil, fmt.Errorf("update: query account: %w", err)
	}

	// Check for optimistic locking
	if !existing.UpdatedAt.Equal(input.UpdatedAt) {
		return nil, ErrAccountModified
	}

	// Check parent account if parent ID is provided
	var parent *ent.LedgerAccount = nil
	if input.ParentID != nil {
		parent, err = client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(*input.ParentID)).
			Only(ctx)
		if err != nil {
			return nil, fmt.Errorf("update: query parent: %w", err)
		}

		if parent.ArchivedAt != nil {
			return nil, ErrParentArchived
		}

		if !parent.IsGroup {
			return nil, ErrParentNotGroup
		}

		if parent.Kind != existing.Kind {
			return nil, ErrParentKindMismatch
		}
	}

	// Check isGroup can be changed if provided
	if input.IsGroup != nil && *input.IsGroup != existing.IsGroup {
		if !existing.IsGroup {
			// If changing from non-group to group, ensure it has no journal entries
			count, err := existing.QueryJournalEntries().Count(ctx)
			if err != nil {
				return nil, fmt.Errorf("update: count journal entries: %w", err)
			}
			if count > 0 {
				return nil, ErrCannotChangeToGroupWithJournalEntries
			}
		} else {
			// If changing from group to non-group, ensure it has no child accounts
			count, err := existing.QueryChildren().Count(ctx)
			if err != nil {
				return nil, fmt.Errorf("update: count children: %w", err)
			}
			if count > 0 {
				return nil, ErrCannotChangeToNonGroupWithChildren
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
		query = query.SetAccountName(encrypted.Ciphertext).
			SetEncryptionKeyID(encrypted.KeyID)
	}

	updated, err := query.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update: save: %w", err)
	}

	// Reload with EncryptionKey edge (Save does not populate edges)
	updated, err = client.LedgerAccount.Query().
		Where(ledgeraccount.ID(updated.ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("update: reload after save: %w", err)
	}

	return m.convertToGraph(ctx, updated)
}
