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
		slog.String("name", input.Name),
		slog.String("kind", string(input.Kind)),
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

	slog.InfoContext(
		ctx,
		"Ledger Account UseCase - Create: completed",
		slog.String("name", input.Name),
		slog.String("kind", string(input.Kind)),
	)

	return account, nil
}

func (u *UseCase) createTx(
	ctx context.Context,
	input graph.CreateLedgerAccountInput,
	encryptedName []byte,
) (*graph.LedgerAccount, error) {
	// Get client from transaction context
	client := u.db
	tx := u.db.TxFromCtx(ctx)
	if tx != nil {
		client = tx.Client()
	}

	var parent *ent.LedgerAccount
	var err error
	if input.ParentID != nil {
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

	created, err := client.LedgerAccount.Create().
		SetPublicID(publicID).
		SetAccountName(encryptedName).
		SetIsGroup(input.IsGroup).
		SetKind(kind).
		SetNillableParentID(parentID).
		Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	return u.convertToGraph(ctx, created)
}
