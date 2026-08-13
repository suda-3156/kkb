package subscription

import (
	"context"
	"fmt"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func (m *SubscriptionManager) convertKindToEnt(kind graph.JournalEntryKind) schema.JournalEntryKind {
	switch kind {
	case graph.JournalEntryKindDebit:
		return schema.Debit
	case graph.JournalEntryKindCredit:
		return schema.Credit
	default:
		panic("invalid journal entry kind")
	}
}

func (m *SubscriptionManager) convertKindToGraph(kind schema.JournalEntryKind) graph.JournalEntryKind {
	switch kind {
	case schema.Debit:
		return graph.JournalEntryKindDebit
	case schema.Credit:
		return graph.JournalEntryKindCredit
	default:
		panic("invalid journal entry kind")
	}
}

func (m *SubscriptionManager) convertStatusToGraph(status schema.SubscriptionStatus) graph.SubscriptionStatus {
	switch status {
	case schema.Active:
		return graph.SubscriptionStatusActive
	case schema.Paused:
		return graph.SubscriptionStatusPaused
	case schema.Canceled:
		return graph.SubscriptionStatusCanceled
	default:
		panic("invalid subscription status")
	}
}

func (m *SubscriptionManager) convertOutcomeToGraph(outcome schema.OccurrenceOutcome) graph.OccurrenceOutcome {
	switch outcome {
	case schema.Materialized:
		return graph.OccurrenceOutcomeMaterialized
	case schema.Skipped:
		return graph.OccurrenceOutcomeSkipped
	default:
		panic("invalid occurrence outcome")
	}
}

// convertToGraph converts a loaded ent subscription. The encryption key edge
// and the template entries edge (with their ledger accounts) must be loaded.
func (m *SubscriptionManager) convertToGraph(ctx context.Context, sub *ent.Subscription) (*graph.Subscription, error) {
	if sub.Edges.EncryptionKey == nil {
		panic("encryption key not loaded for subscription")
	}

	name, err := m.em.Decrypt(ctx, sub.Name, sub.Edges.EncryptionKey.ID)
	if err != nil {
		return nil, fmt.Errorf("convertToGraph: decrypt name: %w", err)
	}

	var entries []*graph.SubscriptionEntry
	for _, te := range sub.Edges.TemplateEntries {
		var ledgerAccount *graph.LedgerAccount
		if te.Edges.LedgerAccount != nil {
			ledgerAccount = &graph.LedgerAccount{
				IntID: te.Edges.LedgerAccount.ID,
			}
		}
		entries = append(entries, &graph.SubscriptionEntry{
			LedgerAccount: ledgerAccount,
			Amount:        te.Amount,
			Kind:          m.convertKindToGraph(te.Kind),
			IntID:         te.ID,
		})
	}

	return &graph.Subscription{
		ID:               sub.PublicID,
		Name:             name,
		RegisteredOn:     sub.RegisteredOn,
		AnchorOn:         sub.AnchorOn,
		NextOccurrenceOn: sub.NextOccurrenceOn,
		CoveredThroughOn: sub.CoveredThroughOn,
		IntervalMonths:   int32(sub.IntervalMonths), //nolint:gosec // Validated to be small on write.
		Status:           m.convertStatusToGraph(sub.Status),
		TemplateEntries:  entries,
		CreatedAt:        sub.CreatedAt,
		UpdatedAt:        sub.UpdatedAt,
		IntID:            sub.ID,
	}, nil
}

// validateName checks the plaintext subscription name.
func validateName(name string) error {
	if name == "" {
		return ErrNameRequired
	}
	if len([]rune(name)) > 200 {
		return ErrNameTooLong
	}
	return nil
}

// validateEntries checks the template entries the same way transaction.Create
// checks journal entries: at least 2, positive 9-digit amounts, balanced.
func validateEntries(entries []*graph.SubscriptionEntryInput) error {
	if len(entries) < 2 {
		return ErrEntriesRequired
	}

	var totalDebit, totalCredit int32
	for _, entry := range entries {
		if entry.Amount <= 0 {
			return ErrAmountMustBePositive
		}
		if len(strconv.FormatInt(int64(entry.Amount), 10)) > 9 {
			return ErrAmountTooLarge
		}
		if entry.Kind == graph.JournalEntryKindDebit {
			totalDebit += entry.Amount
		} else {
			totalCredit += entry.Amount
		}
	}
	if totalDebit != totalCredit {
		return ErrUnbalancedEntries
	}
	return nil
}
