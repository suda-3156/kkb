package subscription

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

func (m *SubscriptionManager) Create(
	ctx context.Context,
	input graph.CreateSubscriptionInput,
) (*graph.Subscription, error) {
	logging.Debug(
		ctx,
		"subscription - create called",
		slog.String("registered_on", input.RegisteredOn.String()),
		slog.Int("entries_count", len(input.Entries)),
	)

	if err := validateName(input.Name); err != nil {
		return nil, err
	}
	if input.IntervalMonths < 1 {
		return nil, ErrIntervalMustBePositive
	}
	if err := validateEntries(input.Entries); err != nil {
		return nil, err
	}

	// The registered day anchors the series; the first occurrence is the
	// nearest one that is today or later (a past registration date is never
	// materialized retroactively).
	today := TodayJST()
	next, err := FirstOccurrenceOnOrAfter(input.RegisteredOn, int(input.IntervalMonths), today)
	if err != nil {
		return nil, fmt.Errorf("create: %w", err)
	}
	covered, err := PrevDay(next)
	if err != nil {
		return nil, fmt.Errorf("create: %w", err)
	}

	encName, err := m.em.Encrypt(ctx, input.Name)
	if err != nil {
		return nil, fmt.Errorf("create: encrypt name: %w", err)
	}

	var sub *graph.Subscription
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		sub, errTx = m.createTx(ctx, client, input, encName.Ciphertext, encName.KeyID, next, covered, today)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("create: %w", err)
	}

	return sub, nil
}

func (m *SubscriptionManager) createTx(
	ctx context.Context,
	client *ent.Client,
	input graph.CreateSubscriptionInput,
	encName []byte,
	keyID int,
	next, covered, today date.Date,
) (*graph.Subscription, error) {
	create := client.Subscription.Create().
		SetPublicID(prid.NewUnsafe("sub_")).
		SetName(encName).
		SetEncryptionKeyID(keyID).
		SetRegisteredOn(input.RegisteredOn).
		SetAnchorOn(input.RegisteredOn).
		SetNextOccurrenceOn(next).
		SetCoveredThroughOn(covered).
		SetIntervalMonths(int(input.IntervalMonths))
	if input.Color != nil {
		create = create.SetColor(string(*input.Color))
	}
	created, err := create.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("save subscription: %w", err)
	}

	if err := m.createTemplateEntries(ctx, client, created.ID, input.Entries); err != nil {
		return nil, err
	}

	// Registered today means billed today: materialize the first occurrence
	// now instead of waiting for tomorrow's job run.
	if created.NextOccurrenceOn == today {
		if err := m.RunDue(ctx, client, created, today); err != nil {
			return nil, err
		}
	}

	return m.reloadAndConvert(ctx, client, created.ID)
}

// createTemplateEntries validates the referenced accounts and writes the
// template entries. Used by Create and by Update's full replacement.
func (m *SubscriptionManager) createTemplateEntries(
	ctx context.Context,
	client *ent.Client,
	subID int,
	entries []*graph.SubscriptionEntryInput,
) error {
	for _, entryInput := range entries {
		lac, err := client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(entryInput.LedgerAccountID)).
			Only(ctx)
		if err != nil {
			if ent.IsNotFound(err) {
				return ErrLedgerAccountNotFound
			}
			return fmt.Errorf("query ledger account: %w", err)
		}

		if lac.ArchivedAt != nil {
			return ErrLedgerAccountArchived
		}
		if lac.IsGroup {
			return ErrLedgerAccountIsGroup
		}

		_, err = client.SubscriptionEntry.Create().
			SetAmount(entryInput.Amount).
			SetKind(m.convertKindToEnt(entryInput.Kind)).
			SetSubscriptionID(subID).
			SetLedgerAccountID(lac.ID).
			Save(ctx)
		if err != nil {
			return fmt.Errorf("save template entry: %w", err)
		}
	}
	return nil
}

// reloadAndConvert re-reads a subscription with the edges convertToGraph
// needs. Mutations go through this so the returned model reflects what was
// actually committed (RunDue may have advanced the pointers).
func (m *SubscriptionManager) reloadAndConvert(
	ctx context.Context,
	client *ent.Client,
	subID int,
) (*graph.Subscription, error) {
	sub, err := client.Subscription.Query().
		Where(entsubscription.ID(subID)).
		WithEncryptionKey().
		WithTemplateEntries(func(q *ent.SubscriptionEntryQuery) {
			q.WithLedgerAccount()
		}).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("reload subscription: %w", err)
	}
	return m.convertToGraph(ctx, sub)
}
