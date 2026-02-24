package ledgeraccount

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	apperr "github.com/suda-3156/kkb/go/internal/error"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *LedgerAccountManager) Create(
	ctx context.Context,
	input graph.CreateLedgerAccountInput,
) (*graph.LedgerAccount, error) {
	logging.Debug(
		ctx,
		"ledger account - create called",
		slog.String("name", input.Name),
		slog.String("kind", string(input.Kind)),
	)

	// Check if the input is valid.
	if input.Name == "" {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("name is required"),
		)
	}

	if len(input.Name) > 100 {
		return nil, apperr.NewBadRequestError(
			fmt.Errorf("name must be at most 100 characters"),
		)
	}

	// Encrypt
	encrypted, err := m.em.Encrypt(ctx, input.Name)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	// Create the account in a transaction.
	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.createTx(ctx, client, input, encrypted)
		return errTx
	}); err != nil {
		return nil, err
	}

	return account, nil
}

func (m *LedgerAccountManager) createTx(
	ctx context.Context,
	client *ent.Client,
	input graph.CreateLedgerAccountInput,
	encrypted *encryption.EncryptionPayload,
) (*graph.LedgerAccount, error) {
	// Get the parent account if parent ID is provided.
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

		if parent.Kind != m.convertKindToEnt(input.Kind) {
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

	kind := m.convertKindToEnt(input.Kind)

	created, err := client.LedgerAccount.Create().
		SetPublicID(publicID).
		SetAccountName(encrypted.Ciphertext).
		SetEncryptionKeyID(encrypted.KeyID).
		SetIsGroup(input.IsGroup).
		SetKind(kind).
		SetNillableParentID(parentID).
		Save(ctx)
	if err != nil {
		return nil, apperr.NewInternalServerError(err)
	}

	created.Edges.Parent = parent
	created.Edges.EncryptionKey = &ent.LedgerEncryptionKey{ID: encrypted.KeyID}

	return m.convertToGraph(ctx, created)
}
