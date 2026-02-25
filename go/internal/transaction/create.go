package transaction

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) Create(
	ctx context.Context,
	input graph.CreateTransactionInput,
) (*graph.Transaction, error) {
	logging.Debug(
		ctx,
		"transaction - create called",
		slog.String("date", input.Date.String()),
		slog.Int("entries_count", len(input.Entries)),
	)

	// Validate entries count.
	if len(input.Entries) < 2 {
		return nil, ErrEntriesRequired
	}

	// Validate description.
	if input.Description == "" {
		return nil, ErrDescriptionRequired
	}

	// Validate amounts and double-entry bookkeeping.
	var totalDebit, totalCredit int32
	for _, entry := range input.Entries {
		if entry.Amount <= 0 {
			return nil, ErrAmountMustBePositive
		}
		if entry.Kind == graph.JournalEntryKindDebit {
			totalDebit += entry.Amount
		} else {
			totalCredit += entry.Amount
		}
	}
	if totalDebit != totalCredit {
		return nil, ErrUnbalancedEntries
	}

	// Encrypt date and description.
	encDate, err := m.em.Encrypt(ctx, input.Date.String())
	if err != nil {
		return nil, fmt.Errorf("create: encrypt date: %w", err)
	}

	encDesc, err := m.em.Encrypt(ctx, input.Description)
	if err != nil {
		return nil, fmt.Errorf("create: encrypt description: %w", err)
	}

	// Encrypt all entry amounts upfront using the same effective key.
	encAmounts := make([][]byte, len(input.Entries))
	for i, entry := range input.Entries {
		payload, err := m.em.Encrypt(ctx, strconv.FormatInt(int64(entry.Amount), 10))
		if err != nil {
			return nil, fmt.Errorf("create: encrypt amount: %w", err)
		}
		encAmounts[i] = payload.Ciphertext
	}

	var txn *graph.Transaction
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		txn, errTx = m.createTx(ctx, client, input, encDate, encDesc, encAmounts)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("create: %w", err)
	}

	return txn, nil
}

func (m *TransactionManager) createTx(
	ctx context.Context,
	client *ent.Client,
	input graph.CreateTransactionInput,
	encDate *encryption.EncryptionPayload,
	encDesc *encryption.EncryptionPayload,
	encAmounts [][]byte,
) (*graph.Transaction, error) {
	publicID := pulid.MustNew("txn_")

	created, err := client.Transaction.Create().
		SetPublicID(publicID).
		SetDate(encDate.Ciphertext).
		SetDescription(encDesc.Ciphertext).
		SetEncryptionKeyID(encDate.KeyID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("create: save transaction: %w", err)
	}

	createdEntries := make([]*ent.JournalEntry, 0, len(input.Entries))
	for i, entryInput := range input.Entries {
		lac, err := client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(entryInput.LedgerAccountID)).
			Only(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return nil, ErrLedgerAccountNotFound
			}
			return nil, fmt.Errorf("create: query ledger account: %w", err)
		}

		if lac.ArchivedAt != nil {
			return nil, ErrLedgerAccountArchived
		}

		if lac.IsGroup {
			return nil, ErrLedgerAccountIsGroup
		}

		entryPublicID := pulid.MustNew("jre_")

		entry, err := client.JournalEntry.Create().
			SetPublicID(entryPublicID).
			SetAmount(encAmounts[i]).
			SetKind(m.convertKindToEnt(entryInput.Kind)).
			SetTransactionID(created.ID).
			SetLedgerAccountID(lac.ID).
			Save(ctx)
		if err != nil {
			return nil, fmt.Errorf("create: save journal entry: %w", err)
		}

		entry.Edges.LedgerAccount = lac
		createdEntries = append(createdEntries, entry)
	}

	created.Edges.EncryptionKey = &ent.LedgerEncryptionKey{ID: encDate.KeyID}
	created.Edges.Entries = createdEntries

	return m.convertToGraph(ctx, created)
}
