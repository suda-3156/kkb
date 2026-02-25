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
		return nil, ErrNameRequired
	}

	if len(input.Name) > 100 {
		return nil, ErrNameTooLong
	}

	// Encrypt
	encrypted, err := m.em.Encrypt(ctx, input.Name)
	if err != nil {
		return nil, fmt.Errorf("create: encrypt name: %w", err)
	}

	// Create the account in a transaction.
	var account *graph.LedgerAccount
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		account, errTx = m.createTx(ctx, client, input, encrypted)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("create: %w", err)
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
			if ent.IsNotFound(err) {
				return nil, ErrParentNotFound
			}
			return nil, fmt.Errorf("create: query parent: %w", err)
		}

		if parent.ArchivedAt != nil {
			return nil, ErrParentIsArchivedOnUnarchive
		}

		if !parent.IsGroup {
			return nil, ErrParentNotGroup
		}

		if parent.Kind != m.convertKindToEnt(input.Kind) {
			return nil, ErrParentKindMismatch
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
		return nil, fmt.Errorf("create: save: %w", err)
	}

	created.Edges.Parent = parent
	created.Edges.EncryptionKey = &ent.LedgerEncryptionKey{ID: encrypted.KeyID}

	return m.convertToGraph(ctx, created)
}
