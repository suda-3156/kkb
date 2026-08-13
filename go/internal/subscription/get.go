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

func (m *SubscriptionManager) GetByPublicID(
	ctx context.Context,
	publicID prid.ID,
) (*graph.Subscription, error) {
	logging.Debug(
		ctx,
		"subscription - get by public ID called",
		slog.String("public_id", publicID.String()),
	)

	sub, err := m.db.Client.Subscription.Query().
		Where(entsubscription.PublicID(publicID)).
		WithEncryptionKey().
		WithTemplateEntries(func(q *ent.SubscriptionEntryQuery) {
			q.WithLedgerAccount()
		}).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("get by public id: %w", err)
	}

	return m.convertToGraph(ctx, sub)
}

// List returns all subscriptions as a plain slice (at most ~100 by
// assumption). By default a canceled subscription is hidden once
// today > coveredThroughOn: the last covered day is still usable, and hiding
// is derived rather than stored.
func (m *SubscriptionManager) List(
	ctx context.Context,
	includeCanceled bool,
) ([]*graph.Subscription, error) {
	logging.Debug(
		ctx,
		"subscription - list called",
		slog.Bool("include_canceled", includeCanceled),
	)

	query := m.db.Client.Subscription.Query().
		WithEncryptionKey().
		WithTemplateEntries(func(q *ent.SubscriptionEntryQuery) {
			q.WithLedgerAccount()
		}).
		Order(ent.Asc(entsubscription.FieldCreatedAt))

	if !includeCanceled {
		query = query.Where(
			entsubscription.Or(
				entsubscription.StatusNEQ(schema.Canceled),
				entsubscription.CoveredThroughOnGTE(TodayJST()),
			),
		)
	}

	subs, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list: %w", err)
	}

	result := make([]*graph.Subscription, 0, len(subs))
	for _, sub := range subs {
		converted, err := m.convertToGraph(ctx, sub)
		if err != nil {
			return nil, err
		}
		result = append(result, converted)
	}
	return result, nil
}
