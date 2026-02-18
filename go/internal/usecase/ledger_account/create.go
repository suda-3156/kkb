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

func (u *UseCase) Create(
	ctx context.Context,
	input graph.CreateLedgerAccountInput,
) (*graph.LedgerAccount, error) {
	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Create: started",
	)

	// Check if the input is valid.
	if input.Name == "" {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("name is required"),
		)
	}

	// Encrypt
	encryptedName, err := u.kms.Encrypt(ctx, input.Name)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	var account *graph.LedgerAccount
	var errTx error
	if err := u.db.WithTxRetry(ctx, func(ctx context.Context) error {
		account, errTx = u.createTx(ctx, input, encryptedName)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (u *UseCase) createTx(
	ctx context.Context,
	input graph.CreateLedgerAccountInput,
	encryptedName []byte,
) (*graph.LedgerAccount, error) {
	var parent *ent.LedgerAccount
	var err error
	if input.ParentID != nil {
		parent, err = u.db.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(*input.ParentID)).
			Only(ctx)
		if err != nil {
			return nil, apperr.NewNotFoundError(
				fmt.Errorf("parent ledger account not found"),
			)
		}

		if parent.ArchivedAt != nil {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("cannot create ledger account under archived parent"),
			)
		}

		if !parent.IsGroup {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("cannot create ledger account under non-group parent"),
			)
		}

		if parent.Kind != convertKindToEnt(input.Kind) {
			return nil, apperr.NewBadRequestError(
				fmt.Errorf("parent ledger account kind must match the new account kind"),
			)
		}
	}

	var parentID *int
	if parent != nil {
		parentID = &parent.ID
	}

	publicID := pulid.MustNew("lac_")

	kind := convertKindToEnt(input.Kind)

	created, err := u.db.LedgerAccount.Create().
		SetPublicID(publicID).
		SetAccountName(encryptedName).
		SetIsGroup(input.IsGroup).
		SetKind(kind).
		SetNillableParentID(parentID).
		Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return &graph.LedgerAccount{
		ID:         created.PublicID,
		Name:       input.Name,
		Kind:       input.Kind,
		IsGroup:    created.IsGroup,
		ArchivedAt: &created.CreatedAt,
		CreatedAt:  created.CreatedAt,
		UpdatedAt:  created.UpdatedAt,
	}, nil
}
