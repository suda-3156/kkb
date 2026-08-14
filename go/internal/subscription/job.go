package subscription

import (
	"context"
	"fmt"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/internal/date"
)

// The two operations below are the domain half of the daily job: what it
// means to find and to safely advance one due subscription. How a job run
// sweeps them and treats failures is caller policy and lives in
// internal/tasks/subscriptions.

// DueSubscriptionIDs returns every subscription the daily sweep should
// process: not canceled, pointer at or before today. The list is a snapshot;
// MaterializeOne re-checks everything under a row lock.
func (m *SubscriptionManager) DueSubscriptionIDs(ctx context.Context, today date.Date) ([]int, error) {
	ids, err := m.db.Client.Subscription.Query().
		Where(
			entsubscription.StatusNEQ(schema.Canceled),
			entsubscription.NextOccurrenceOnLTE(today),
		).
		IDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("due subscription ids: %w", err)
	}
	return ids, nil
}

// MaterializeOne advances one subscription in its own DB transaction,
// reloading it FOR UPDATE first, so a concurrent user mutation or a duplicate
// scheduler invocation serializes against it; the unique constraint on
// (occurrence_on, subscription) is the last line of defense. Creating the
// transactions and moving the pointer commit together, which is the primary
// idempotency guarantee.
//
// A subscription that is no longer due (or was canceled meanwhile) is a
// no-op, so calling this with a stale ID is harmless.
func (m *SubscriptionManager) MaterializeOne(ctx context.Context, id int, today date.Date) error {
	return m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
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
