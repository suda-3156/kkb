package subscription

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/ent/subscriptionentry"
	"github.com/suda-3156/kkb/go/ent/subscriptionoccurrence"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/logging"
)

func (m *SubscriptionManager) Update(
	ctx context.Context,
	input graph.UpdateSubscriptionInput, //nolint:gocritic // To follow the generated code pattern.
) (*graph.Subscription, error) {
	logging.Debug(
		ctx,
		"subscription - update called",
		slog.String("id", input.ID.String()),
	)

	if input.Name != nil {
		if err := validateName(*input.Name); err != nil {
			return nil, err
		}
	}
	if input.IntervalMonths != nil && *input.IntervalMonths < 1 {
		return nil, ErrIntervalMustBePositive
	}
	if len(input.Entries) > 0 {
		if err := validateEntries(input.Entries); err != nil {
			return nil, err
		}
	}

	var encName *encryption.EncryptionPayload
	if input.Name != nil {
		var err error
		encName, err = m.em.Encrypt(ctx, *input.Name)
		if err != nil {
			return nil, fmt.Errorf("update: encrypt name: %w", err)
		}
	}

	var sub *graph.Subscription
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		sub, errTx = m.updateTx(ctx, client, input, encName)
		return errTx
	}); err != nil {
		return nil, err
	}

	logging.Info(
		ctx,
		"subscription - update: completed",
		slog.String("id", input.ID.String()),
	)

	return sub, nil
}

func (m *SubscriptionManager) updateTx(
	ctx context.Context,
	client *ent.Client,
	input graph.UpdateSubscriptionInput, //nolint:gocritic // To follow the generated code pattern.
	encName *encryption.EncryptionPayload,
) (*graph.Subscription, error) {
	existing, err := client.Subscription.Query().
		Where(entsubscription.PublicID(input.ID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("update: query subscription: %w", err)
	}

	// Check for optimistic locking.
	if !existing.UpdatedAt.Equal(input.UpdatedAt) {
		return nil, ErrSubscriptionModified
	}

	updateQuery := existing.Update()

	if encName != nil {
		updateQuery = updateQuery.
			SetName(encName.Ciphertext).
			SetEncryptionKeyID(encName.KeyID)
	}

	// A new interval takes effect from the next occurrence on: the current
	// nextOccurrenceOn deliberately stays put.
	if input.IntervalMonths != nil {
		updateQuery = updateQuery.SetIntervalMonths(int(*input.IntervalMonths))
	}

	if input.RegisteredOn != nil && *input.RegisteredOn != existing.RegisteredOn {
		updateQuery = updateQuery.SetRegisteredOn(*input.RegisteredOn)

		// While no occurrence has been recorded yet, changing the registered
		// day re-derives the schedule with the exact same rule as creation.
		// Once a single occurrence exists, only the recorded fact changes:
		// moving dates then would either revisit a materialized occurrence or
		// amount to retroactive input.
		hasLog, err := client.SubscriptionOccurrence.Query().
			Where(subscriptionoccurrence.HasSubscriptionWith(entsubscription.ID(existing.ID))).
			Exist(ctx)
		if err != nil {
			return nil, fmt.Errorf("update: query occurrence log: %w", err)
		}

		if !hasLog {
			interval := existing.IntervalMonths
			if input.IntervalMonths != nil {
				interval = int(*input.IntervalMonths)
			}

			today := TodayJST()
			next, err := FirstOccurrenceOnOrAfter(*input.RegisteredOn, interval, today)
			if err != nil {
				return nil, fmt.Errorf("update: %w", err)
			}
			covered, err := PrevDay(next)
			if err != nil {
				return nil, fmt.Errorf("update: %w", err)
			}

			updateQuery = updateQuery.
				SetAnchorOn(*input.RegisteredOn).
				SetNextOccurrenceOn(next).
				SetCoveredThroughOn(covered)
		}
	}

	updated, err := updateQuery.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update: save subscription: %w", err)
	}

	// Replace template entries if provided.
	if len(input.Entries) > 0 {
		_, err = client.SubscriptionEntry.Delete().
			Where(subscriptionentry.HasSubscriptionWith(entsubscription.ID(updated.ID))).
			Exec(ctx)
		if err != nil {
			return nil, fmt.Errorf("update: delete old template entries: %w", err)
		}

		if err := m.createTemplateEntries(ctx, client, updated.ID, input.Entries); err != nil {
			return nil, err
		}
	}

	return m.reloadAndConvert(ctx, client, updated.ID)
}
