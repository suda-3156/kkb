package subscription

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/ent/subscriptionentry"
	"github.com/suda-3156/kkb/go/ent/subscriptionoccurrence"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// RunDue advances one subscription until nextOccurrenceOn is past today,
// materializing (ACTIVE) or skipping (PAUSED) each due occurrence. CANCELED
// subscriptions are never touched: their pointer stays frozen so "usable until
// coveredThroughOn" keeps meaning something.
//
// The caller owns the DB transaction and must have loaded sub through the
// given client (the daily job additionally reloads it FOR UPDATE). Creating
// the transactions and advancing the pointer commit together, which is the
// primary idempotency guarantee; the unique constraint on
// (occurrence_on, subscription) is the second line of defense.
//
// Callers are exactly two by design: the daily job's loop, and
// createSubscription when the first occurrence lands on today.
func (m *SubscriptionManager) RunDue(
	ctx context.Context,
	client *ent.Client,
	sub *ent.Subscription,
	today date.Date,
) error {
	if sub.Status == schema.Canceled {
		return nil
	}
	if sub.NextOccurrenceOn > today {
		return nil
	}

	// Decrypt the name once; every generated memo derives from it.
	keyID, err := client.Subscription.QueryEncryptionKey(sub).OnlyID(ctx)
	if err != nil {
		return fmt.Errorf("run due: query encryption key: %w", err)
	}
	name, err := m.em.Decrypt(ctx, sub.Name, keyID)
	if err != nil {
		return fmt.Errorf("run due: decrypt name: %w", err)
	}

	templates, err := client.SubscriptionEntry.Query().
		Where(subscriptionentry.HasSubscriptionWith(entsubscription.ID(sub.ID))).
		WithLedgerAccount().
		All(ctx)
	if err != nil {
		return fmt.Errorf("run due: query template entries: %w", err)
	}

	next := sub.NextOccurrenceOn
	covered := sub.CoveredThroughOn
	// Bounded by the number of elapsed intervals, so it cannot run away.
	for next <= today {
		materialized := sub.Status != schema.Paused

		if materialized {
			if err := m.materializeOne(ctx, client, sub, name, templates, next); err != nil {
				return err
			}
		} else {
			if err := m.recordSkip(ctx, client, sub.ID, next); err != nil {
				return err
			}
		}

		newNext, err := NextOccurrence(next, sub.AnchorOn, sub.IntervalMonths)
		if err != nil {
			return fmt.Errorf("run due: %w", err)
		}
		next = newNext

		// coveredThroughOn moves only on materialization, never on a skip:
		// a skipped period was not paid for.
		if materialized {
			covered, err = PrevDay(next)
			if err != nil {
				return fmt.Errorf("run due: %w", err)
			}
		}
	}

	_, err = client.Subscription.UpdateOneID(sub.ID).
		SetNextOccurrenceOn(next).
		SetCoveredThroughOn(covered).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("run due: advance pointer: %w", err)
	}

	return nil
}

// materializeOne creates the transaction for one occurrence and writes the
// MATERIALIZED log row. A same-day SKIPPED row (pause undone on the very day)
// is upgraded in place, so the unique constraint only ever forbids a second
// MATERIALIZED row. An existing MATERIALIZED row means there is nothing to do.
func (m *SubscriptionManager) materializeOne(
	ctx context.Context,
	client *ent.Client,
	sub *ent.Subscription,
	name string,
	templates []*ent.SubscriptionEntry,
	occurrenceOn date.Date,
) error {
	existing, err := client.SubscriptionOccurrence.Query().
		Where(
			subscriptionoccurrence.OccurrenceOn(occurrenceOn),
			subscriptionoccurrence.HasSubscriptionWith(entsubscription.ID(sub.ID)),
		).
		Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return fmt.Errorf("materialize: query occurrence: %w", err)
	}

	switch {
	case existing == nil:
		_, err = client.SubscriptionOccurrence.Create().
			SetOccurrenceOn(occurrenceOn).
			SetOutcome(schema.Materialized).
			SetSubscriptionID(sub.ID).
			Save(ctx)
		if err != nil {
			return fmt.Errorf("materialize: save occurrence: %w", err)
		}
	case existing.Outcome == schema.Materialized:
		return nil
	default: // SKIPPED, upgraded by the same-day resume rule
		_, err = client.SubscriptionOccurrence.UpdateOne(existing).
			SetOutcome(schema.Materialized).
			Save(ctx)
		if err != nil {
			return fmt.Errorf("materialize: upgrade skipped occurrence: %w", err)
		}
	}

	occTime, err := timeOf(occurrenceOn)
	if err != nil {
		return fmt.Errorf("materialize: %w", err)
	}

	memo := fmt.Sprintf("【%d年%d月】%s", occTime.Year(), int(occTime.Month()), name)
	encMemo, err := m.em.Encrypt(ctx, memo)
	if err != nil {
		return fmt.Errorf("materialize: encrypt memo: %w", err)
	}

	txn, err := client.Transaction.Create().
		SetPublicID(prid.NewUnsafe("txn_")).
		SetDate(occurrenceOn).
		SetDescription(encMemo.Ciphertext).
		SetEncryptionKeyID(encMemo.KeyID).
		SetSubscriptionID(sub.ID).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("materialize: save transaction: %w", err)
	}

	for _, te := range templates {
		lac := te.Edges.LedgerAccount
		if lac == nil {
			return fmt.Errorf("materialize: ledger account not loaded for template entry %d", te.ID)
		}
		// transaction.Create refuses these too; without this check the job
		// would produce an invalid transaction from a stale template.
		if lac.ArchivedAt != nil {
			return ErrLedgerAccountArchived
		}
		if lac.IsGroup {
			return ErrLedgerAccountIsGroup
		}

		_, err := client.JournalEntry.Create().
			SetAmount(te.Amount).
			SetKind(te.Kind).
			SetTransactionID(txn.ID).
			SetLedgerAccountID(lac.ID).
			Save(ctx)
		if err != nil {
			return fmt.Errorf("materialize: save journal entry: %w", err)
		}
	}

	return nil
}

func (m *SubscriptionManager) recordSkip(
	ctx context.Context,
	client *ent.Client,
	subID int,
	occurrenceOn date.Date,
) error {
	_, err := client.SubscriptionOccurrence.Create().
		SetOccurrenceOn(occurrenceOn).
		SetOutcome(schema.Skipped).
		SetSubscriptionID(subID).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("record skip: %w", err)
	}
	return nil
}
