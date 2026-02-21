package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	apperr "github.com/suda-3156/kkb/go/internal/error"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (s *Service) Update(
	ctx context.Context,
	input graph.UpdateLedgerAccountInput,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account Service - Update: started",
		slog.String("public_id", input.ID.String()),
	)

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
	var encryptedName []byte
	var err error
	if input.Name != nil {
		encryptedName, err = s.kms.Encrypt(ctx, *input.Name)
		if err != nil {
			return nil, apperr.NewInternalServerError(err)
		}
	}

	var account *graph.LedgerAccount
	var errTx error
	if err := s.db.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = s.updateTx(ctx, input, encryptedName)
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

func (s *Service) updateTx(
	ctx context.Context,
	input graph.UpdateLedgerAccountInput,
	encryptedName []byte,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := s.db
	tx := s.db.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	// Get the existing ledger account
	existing, err := client.LedgerAccount.Query().
		Where(ledgeraccount.PublicID(input.ID)).
		Only(ctx)
	if err != nil {
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
	if input.ParentID != nil && input.ParentID != &existing.Edges.Parent.PublicID {
		parent, err = client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(*input.ParentID)).
			Only(ctx)
		if err != nil {
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
		query = query.SetAccountName(encryptedName)
	}

	updated, err := query.Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return s.convertToGraph(ctx, updated)
}
