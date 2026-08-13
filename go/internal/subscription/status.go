package subscription

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// Pause is a plain toggle: the job keeps skipping occurrences until an
// explicit resume. Already paused is a no-op; a canceled subscription must be
// uncanceled first.
func (m *SubscriptionManager) Pause(ctx context.Context, id prid.ID) (*graph.Subscription, error) {
	return m.changeStatus(ctx, id, "pause", func(sub *ent.Subscription) (*ent.SubscriptionUpdateOne, error) {
		switch sub.Status {
		case schema.Paused:
			return nil, nil // no-op
		case schema.Canceled:
			return nil, ErrSubscriptionCanceled
		default:
			return sub.Update().SetStatus(schema.Paused), nil
		}
	})
}

// Resume reactivates a paused subscription with the shared reactivation rule.
func (m *SubscriptionManager) Resume(ctx context.Context, id prid.ID) (*graph.Subscription, error) {
	return m.changeStatus(ctx, id, "resume", func(sub *ent.Subscription) (*ent.SubscriptionUpdateOne, error) {
		switch sub.Status {
		case schema.Active:
			return nil, nil // no-op
		case schema.Canceled:
			return nil, ErrSubscriptionCanceled
		default:
			return m.reactivate(sub)
		}
	})
}

// Cancel freezes the subscription: the job stops touching it, so
// nextOccurrenceOn keeps meaning "where billing would resume". The record is
// kept forever (it carries the payment history); the UI hides it once
// today > coveredThroughOn.
func (m *SubscriptionManager) Cancel(ctx context.Context, id prid.ID) (*graph.Subscription, error) {
	return m.changeStatus(ctx, id, "cancel", func(sub *ent.Subscription) (*ent.SubscriptionUpdateOne, error) {
		if sub.Status == schema.Canceled {
			return nil, nil // no-op
		}
		return sub.Update().SetStatus(schema.Canceled), nil
	})
}

// Uncancel reactivates a canceled subscription. It shares the reactivation
// rule with Resume because cancellation is defined by coveredThroughOn:
// "usable until the covered period ends".
func (m *SubscriptionManager) Uncancel(ctx context.Context, id prid.ID) (*graph.Subscription, error) {
	return m.changeStatus(ctx, id, "uncancel", func(sub *ent.Subscription) (*ent.SubscriptionUpdateOne, error) {
		if sub.Status != schema.Canceled {
			return nil, nil // no-op
		}
		return m.reactivate(sub)
	})
}

// reactivate implements the rule shared by resume and uncancel:
//
//	nextOccurrenceOn = max(today, coveredThroughOn + 1 day)
//	anchorOn = nextOccurrenceOn, but only when it actually moved
//
// While the paid period still runs the date stays put (no double billing);
// once it has lapsed, billing restarts today and the anchor moves with it.
// The invariant "nextOccurrenceOn > last materialized day" holds because
// coveredThroughOn is only ever written as nextOccurrenceOn - 1 at
// materialization. No occurrence is materialized here: the job's next run
// picks the pointer up (and upgrades a same-day SKIPPED row if any).
func (m *SubscriptionManager) reactivate(sub *ent.Subscription) (*ent.SubscriptionUpdateOne, error) {
	today := TodayJST()
	next, err := ReactivationNextOccurrence(today, sub.CoveredThroughOn)
	if err != nil {
		return nil, fmt.Errorf("reactivate: %w", err)
	}

	update := sub.Update().
		SetStatus(schema.Active).
		SetNextOccurrenceOn(next)
	if next != sub.NextOccurrenceOn {
		update = update.SetAnchorOn(next)
	}
	return update, nil
}

// changeStatus wraps the shared plumbing of the four status verbs: load,
// decide, save, reload. decide returns nil to signal a no-op (the verbs are
// idempotent, like archiveLedgerAccount).
func (m *SubscriptionManager) changeStatus(
	ctx context.Context,
	id prid.ID,
	verb string,
	decide func(*ent.Subscription) (*ent.SubscriptionUpdateOne, error),
) (*graph.Subscription, error) {
	logging.Debug(
		ctx,
		"subscription - "+verb+" called",
		slog.String("public_id", id.String()),
	)

	var sub *graph.Subscription
	var errTx error
	if err := m.db.Client.WithTx(ctx, func(ctx context.Context, client *ent.Client) error {
		sub, errTx = m.changeStatusTx(ctx, client, id, decide)
		return errTx
	}); err != nil {
		return nil, fmt.Errorf("%s: %w", verb, err)
	}

	return sub, nil
}

func (m *SubscriptionManager) changeStatusTx(
	ctx context.Context,
	client *ent.Client,
	id prid.ID,
	decide func(*ent.Subscription) (*ent.SubscriptionUpdateOne, error),
) (*graph.Subscription, error) {
	existing, err := client.Subscription.Query().
		Where(entsubscription.PublicID(id)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("query subscription: %w", err)
	}

	update, err := decide(existing)
	if err != nil {
		return nil, err
	}

	if update != nil {
		if _, err := update.Save(ctx); err != nil {
			return nil, fmt.Errorf("save subscription: %w", err)
		}
	}

	return m.reloadAndConvert(ctx, client, existing.ID)
}
