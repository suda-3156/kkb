package transaction

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

func (m *TransactionManager) Update(
	ctx context.Context,
	input graph.UpdateTransactionInput,
) (*graph.Transaction, error) {
	logging.Debug(
		ctx,
		"transaction - update called",
		slog.String("id", input.ID.String()),
	)

	// Validate amounts and double-entry bookkeeping when entries are provided.
	if len(input.Entries) > 0 {
		if len(input.Entries) < 2 {
			return nil, ErrEntriesRequired
		}

		var totalDebit, totalCredit int32
		for _, entry := range input.Entries {
			if entry.Amount <= 0 {
				return nil, ErrAmountMustBePositive
			}

			if len(strconv.FormatInt(int64(entry.Amount), 10)) > 9 {
				return nil, ErrAmountTooLarge
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
	}

	// Validate and encrypt description if provided.
	var encDesc *encryption.EncryptionPayload
	if input.Description != nil {
		if len([]rune(*input.Description)) > 300 {
			return nil, ErrDescriptionTooLong
		}

		var err error
		encDesc, err = m.em.Encrypt(ctx, *input.Description)
		if err != nil {
			return nil, fmt.Errorf("update: encrypt description: %w", err)
		}
	}

	// Encrypt entry amounts if entries are provided, using the same effective key.
	var encAmounts [][]byte
	for _, entry := range input.Entries {
		payload, err := m.em.Encrypt(ctx, strconv.FormatInt(int64(entry.Amount), 10))
		if err != nil {
			return nil, fmt.Errorf("update: encrypt amount: %w", err)
		}
		encAmounts = append(encAmounts, payload.Ciphertext)
	}

	var txn *graph.Transaction
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		txn, errTx = m.updateTx(ctx, client, input, encDesc, encAmounts)
		return errTx
	}); err != nil {
		return nil, err
	}

	logging.Info(
		ctx,
		"transaction - update: completed",
		slog.String("id", input.ID.String()),
	)

	return txn, nil
}

func (m *TransactionManager) updateTx(
	ctx context.Context,
	client *ent.Client,
	input graph.UpdateTransactionInput,
	encDesc *encryption.EncryptionPayload,
	encAmounts [][]byte,
) (*graph.Transaction, error) {
	// Get the existing transaction.
	existing, err := client.Transaction.Query().
		Where(transaction.PublicID(input.ID)).
		WithEncryptionKey().
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrTransactionNotFound
		}
		return nil, fmt.Errorf("update: query transaction: %w", err)
	}

	// Check for optimistic locking.
	if !existing.UpdatedAt.Equal(input.UpdatedAt) {
		return nil, ErrTransactionModified
	}

	// Build the update query.
	updateQuery := existing.Update()

	if input.Date != nil {
		updateQuery = updateQuery.SetDate(*input.Date)
	}

	if encDesc != nil {
		updateQuery = updateQuery.
			SetDescription(encDesc.Ciphertext).
			SetEncryptionKeyID(encDesc.KeyID)
	}

	updated, err := updateQuery.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update: save transaction: %w", err)
	}

	// Replace journal entries if provided.
	if len(input.Entries) > 0 {
		// Delete existing journal entries.
		_, err = client.JournalEntry.Delete().
			Where(journalentry.HasTransactionWith(transaction.ID(updated.ID))).
			Exec(ctx)
		if err != nil {
			return nil, fmt.Errorf("update: delete old journal entries: %w", err)
		}

		// Create new journal entries.
		createdEntries := make([]*ent.JournalEntry, 0, len(input.Entries))
		for i, entryInput := range input.Entries {
			lac, err := client.LedgerAccount.Query().
				Where(ledgeraccount.PublicID(entryInput.LedgerAccountID)).
				Only(ctx)
			if err != nil {
				if ent.IsNotFound(err) {
					return nil, ErrLedgerAccountNotFound
				}
				return nil, fmt.Errorf("update: query ledger account: %w", err)
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
				SetTransactionID(updated.ID).
				SetLedgerAccountID(lac.ID).
				Save(ctx)
			if err != nil {
				return nil, fmt.Errorf("update: save journal entry: %w", err)
			}

			entry.Edges.LedgerAccount = lac
			createdEntries = append(createdEntries, entry)
		}

		updated.Edges.Entries = createdEntries
	} else {
		// Reload existing entries.
		entries, err := client.JournalEntry.Query().
			Where(journalentry.HasTransactionWith(transaction.ID(updated.ID))).
			WithLedgerAccount().
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("update: reload journal entries: %w", err)
		}
		updated.Edges.Entries = entries
	}

	// Restore the encryption key edge (Save does not populate edges).
	keyID := existing.Edges.EncryptionKey.ID
	if encDesc != nil {
		keyID = encDesc.KeyID
	}
	updated.Edges.EncryptionKey = &ent.LedgerEncryptionKey{ID: keyID}

	return m.convertToGraph(ctx, updated)
}
