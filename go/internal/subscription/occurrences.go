package subscription

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/ent/subscriptionoccurrence"
	enttransaction "github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
)

// Occurrences returns one subscription's payment history, newest first. The
// materialization log is the source of truth: an occurrence whose transaction
// was deleted afterwards still appears, with a nil transaction.
//
// The log deliberately holds no transaction reference (transactions are
// hard-deleted), so the transaction is recovered by matching
// (subscription, date). A materialized transaction whose date was later
// edited away therefore also shows as nil here; the transaction itself is
// still reachable through the normal transaction list.
func (m *SubscriptionManager) Occurrences(
	ctx context.Context,
	subIntID int,
	startDate, endDate *date.Date,
) ([]*graph.SubscriptionOccurrence, error) {
	logging.Debug(
		ctx,
		"subscription - occurrences called",
		slog.Int("subscription_id", subIntID),
	)

	query := m.db.Client.SubscriptionOccurrence.Query().
		Where(subscriptionoccurrence.HasSubscriptionWith(entsubscription.ID(subIntID))).
		Order(ent.Desc(subscriptionoccurrence.FieldOccurrenceOn))
	if startDate != nil {
		query = query.Where(subscriptionoccurrence.OccurrenceOnGTE(*startDate))
	}
	if endDate != nil {
		query = query.Where(subscriptionoccurrence.OccurrenceOnLTE(*endDate))
	}

	occs, err := query.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("occurrences: %w", err)
	}
	if len(occs) == 0 {
		return []*graph.SubscriptionOccurrence{}, nil
	}

	dates := make([]date.Date, 0, len(occs))
	for _, occ := range occs {
		dates = append(dates, occ.OccurrenceOn)
	}

	txns, err := m.db.Client.Transaction.Query().
		Where(
			enttransaction.HasSubscriptionWith(entsubscription.ID(subIntID)),
			enttransaction.DateIn(dates...),
		).
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		}).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("occurrences: query transactions: %w", err)
	}

	txnByDate := make(map[date.Date]*graph.Transaction, len(txns))
	for _, txn := range txns {
		converted, err := m.tm.ToGraph(ctx, txn)
		if err != nil {
			return nil, fmt.Errorf("occurrences: %w", err)
		}
		txnByDate[txn.Date] = converted
	}

	result := make([]*graph.SubscriptionOccurrence, 0, len(occs))
	for _, occ := range occs {
		converted := &graph.SubscriptionOccurrence{
			OccurrenceOn: occ.OccurrenceOn,
			Outcome:      m.convertOutcomeToGraph(occ.Outcome),
			CreatedAt:    occ.CreatedAt,
			IntID:        occ.ID,
		}
		if occ.Outcome == schema.Materialized {
			converted.Transaction = txnByDate[occ.OccurrenceOn]
		}
		result = append(result, converted)
	}
	return result, nil
}

// Calendar returns every subscription occurrence falling in the given month:
// processed ones from the log (outcome set, transaction matched by
// (subscription, date)), and projected future ones from each non-canceled
// subscription's pointer (outcome nil). Projection lives here so the sticky
// month-end rounding stays in one place, on the server.
func (m *SubscriptionManager) Calendar(
	ctx context.Context,
	year, month int,
) ([]*graph.SubscriptionCalendarEntry, error) {
	logging.Debug(
		ctx,
		"subscription - calendar called",
		slog.Int("year", year),
		slog.Int("month", month),
	)

	if month < 1 || month > 12 {
		return nil, ErrInvalidMonth
	}
	if year < 1970 || year > 9999 {
		return nil, ErrInvalidYear
	}

	monthStart := date.Date(fmt.Sprintf("%04d-%02d-01", year, month))
	monthEnd := date.Date(fmt.Sprintf("%04d-%02d-%02d", year, month, daysInYM(year, month)))

	// All subscriptions, converted once; both log rows and projections
	// reference them. At most ~100 by assumption.
	subs, err := m.db.Client.Subscription.Query().
		WithEncryptionKey().
		WithTemplateEntries(func(q *ent.SubscriptionEntryQuery) {
			q.WithLedgerAccount()
		}).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("calendar: query subscriptions: %w", err)
	}

	subByID := make(map[int]*graph.Subscription, len(subs))
	for _, sub := range subs {
		converted, err := m.convertToGraph(ctx, sub)
		if err != nil {
			return nil, fmt.Errorf("calendar: %w", err)
		}
		subByID[sub.ID] = converted
	}

	var entries []*graph.SubscriptionCalendarEntry

	// Processed occurrences from the log.
	occs, err := m.db.Client.SubscriptionOccurrence.Query().
		Where(
			subscriptionoccurrence.OccurrenceOnGTE(monthStart),
			subscriptionoccurrence.OccurrenceOnLTE(monthEnd),
		).
		WithSubscription().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("calendar: query occurrences: %w", err)
	}

	txnByKey, err := m.transactionsByKey(ctx, monthStart, monthEnd)
	if err != nil {
		return nil, err
	}

	for _, occ := range occs {
		if occ.Edges.Subscription == nil {
			return nil, fmt.Errorf("calendar: subscription not loaded for occurrence %d", occ.ID)
		}
		subID := occ.Edges.Subscription.ID
		outcome := m.convertOutcomeToGraph(occ.Outcome)
		entry := &graph.SubscriptionCalendarEntry{
			OccurrenceOn: occ.OccurrenceOn,
			Subscription: subByID[subID],
			Outcome:      &outcome,
		}
		if occ.Outcome == schema.Materialized {
			entry.Transaction = txnByKey[calendarKey{subID, occ.OccurrenceOn}]
		}
		entries = append(entries, entry)
	}

	// Future (unprocessed) occurrences, projected from the pointer. A canceled
	// subscription is frozen and projects nothing. The pointer may lie in the
	// past when the job is lagging; those show up as unprocessed too.
	for _, sub := range subs {
		if sub.Status == schema.Canceled {
			continue
		}

		occ := sub.NextOccurrenceOn
		// The pointer moves at least a month per step, so the cap is only a
		// guard against a far-future query month walking a long series.
		for iter := 0; occ <= monthEnd && iter < 4800; iter++ {
			if occ >= monthStart {
				entries = append(entries, &graph.SubscriptionCalendarEntry{
					OccurrenceOn: occ,
					Subscription: subByID[sub.ID],
				})
			}
			next, err := NextOccurrence(occ, sub.AnchorOn, sub.IntervalMonths)
			if err != nil {
				return nil, fmt.Errorf("calendar: %w", err)
			}
			occ = next
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].OccurrenceOn != entries[j].OccurrenceOn {
			return entries[i].OccurrenceOn < entries[j].OccurrenceOn
		}
		return entries[i].Subscription.IntID < entries[j].Subscription.IntID
	})

	return entries, nil
}

type calendarKey struct {
	subID int
	on    date.Date
}

func (m *SubscriptionManager) transactionsByKey(
	ctx context.Context,
	start, end date.Date,
) (map[calendarKey]*graph.Transaction, error) {
	txns, err := m.db.Client.Transaction.Query().
		Where(
			enttransaction.HasSubscription(),
			enttransaction.DateGTE(start),
			enttransaction.DateLTE(end),
		).
		WithSubscription().
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount()
		}).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("calendar: query transactions: %w", err)
	}

	byKey := make(map[calendarKey]*graph.Transaction, len(txns))
	for _, txn := range txns {
		if txn.Edges.Subscription == nil {
			continue
		}
		converted, err := m.tm.ToGraph(ctx, txn)
		if err != nil {
			return nil, fmt.Errorf("calendar: %w", err)
		}
		byKey[calendarKey{txn.Edges.Subscription.ID, txn.Date}] = converted
	}
	return byKey, nil
}

func daysInYM(year, month int) int {
	return daysIn(year, time.Month(month))
}
