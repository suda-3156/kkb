package subscription

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
)

// MaterializeDue is the daily job's task body: it advances every subscription
// whose pointer is due. Each subscription runs in its own DB transaction and
// is reloaded FOR UPDATE there, so a concurrent user mutation or a duplicate
// scheduler invocation serializes against it; the unique constraint on
// (occurrence_on, subscription) is the last line of defense.
//
// One subscription's failure (an archived account in its template, say) is
// logged and does not stop the others; if any failed, the whole task fails so
// the Cloud Monitoring alert fires.
func (m *SubscriptionManager) MaterializeDue(ctx context.Context, today date.Date) error {
	ids, err := m.db.Client.Subscription.Query().
		Where(
			entsubscription.StatusNEQ(schema.Canceled),
			entsubscription.NextOccurrenceOnLTE(today),
		).
		IDs(ctx)
	if err != nil {
		return fmt.Errorf("materialize due: query due subscriptions: %w", err)
	}

	logging.Info(
		ctx,
		"subscription - materialize due: starting",
		slog.String("today", today.String()),
		slog.Int("due_count", len(ids)),
	)

	var failures []error
	for _, id := range ids {
		if err := m.materializeDueOne(ctx, id, today); err != nil {
			logging.Error(
				ctx,
				"subscription - materialize due: subscription failed",
				slog.Int("subscription_id", id),
				slog.Any("error", err),
			)
			failures = append(failures, fmt.Errorf("subscription id=%d: %w", id, err))
		}
	}

	logging.Info(
		ctx,
		"subscription - materialize due: finished",
		slog.Int("due_count", len(ids)),
		slog.Int("failed_count", len(failures)),
	)

	if len(failures) > 0 {
		return fmt.Errorf("materialize due: %d of %d subscriptions failed: %w",
			len(failures), len(ids), errors.Join(failures...))
	}
	return nil
}

func (m *SubscriptionManager) materializeDueOne(ctx context.Context, id int, today date.Date) error {
	return m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		// Reload inside the transaction with a row lock: the ID list above is a
		// stale snapshot, and the status or pointer may have changed since.
		sub, err := client.Subscription.Query().
			Where(entsubscription.ID(id)).
			ForUpdate().
			Only(ctx)
		if err != nil {
			return fmt.Errorf("reload for update: %w", err)
		}

		return m.RunDue(ctx, client, sub, today)
	})
}
