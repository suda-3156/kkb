package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	"github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/suda-3156/kkb/go/internal/prid"
	"github.com/suda-3156/kkb/go/internal/subscription"
)

type Subscription struct {
	Name            string  `json:"name"`
	RegisteredOn    string  `json:"registered_on"`
	IntervalMonths  int     `json:"interval_months"`
	Color           string  `json:"color,omitempty"`             // SubscriptionColor token; empty means automatic
	Status          string  `json:"status,omitempty"`            // "ACTIVE" (default), "PAUSED", or "CANCELED"
	StatusChangedOn string  `json:"status_changed_on,omitempty"` // Day the pause/cancel happened; required for non-ACTIVE
	Entries         []Entry `json:"entries"`
}

// insertSubscriptions seeds subscriptions with realistic history by replaying
// real code paths instead of fabricating rows: each definition starts with its
// pointer at the registration day, then RunDue's catch-up materializes every
// occurrence up to a simulated "today". A pause or cancellation is applied at
// its recorded day, so a paused subscription carries MATERIALIZED rows before
// it and SKIPPED rows after, and a canceled one stays frozen at that point.
func insertSubscriptions(
	ctx context.Context,
	client *ent.Client,
	em *encryption.EncryptionManager,
	sm *subscription.SubscriptionManager,
	accountMap map[string]prid.ID,
) error {
	var seeds []Subscription

	subscriptionsJSON, err := os.ReadFile(subscriptionsSeedPath)
	if err != nil {
		return fmt.Errorf("read JSON: %w", err)
	}

	if err := json.Unmarshal(subscriptionsJSON, &seeds); err != nil {
		return fmt.Errorf("insertSubscriptions: parse JSON: %w", err)
	}

	logging.Info(ctx, "inserting subscriptions", "count", len(seeds))

	today := subscription.TodayJST()

	for i, s := range seeds {
		if err := insertSubscription(ctx, client, em, sm, accountMap, &s, today); err != nil {
			return fmt.Errorf("insertSubscriptions[%d] %q: %w", i, s.Name, err)
		}
	}

	logging.Info(ctx, "all subscriptions inserted successfully", "total", len(seeds))
	return nil
}

func insertSubscription(
	ctx context.Context,
	client *ent.Client,
	em *encryption.EncryptionManager,
	sm *subscription.SubscriptionManager,
	accountMap map[string]prid.ID,
	s *Subscription,
	today date.Date,
) error {
	registered, err := date.NewDate(s.RegisteredOn)
	if err != nil {
		return fmt.Errorf("invalid registered_on %q: %w", s.RegisteredOn, err)
	}

	status := schema.Active
	switch s.Status {
	case "", string(schema.Active):
		// stays active
	case string(schema.Paused):
		status = schema.Paused
	case string(schema.Canceled):
		status = schema.Canceled
	default:
		return fmt.Errorf("unknown status %q", s.Status)
	}

	var statusChangedOn date.Date
	if status != schema.Active {
		if s.StatusChangedOn == "" {
			return fmt.Errorf("status_changed_on is required for status %q", s.Status)
		}
		changed, err := date.NewDate(s.StatusChangedOn)
		if err != nil {
			return fmt.Errorf("invalid status_changed_on %q: %w", s.StatusChangedOn, err)
		}
		statusChangedOn = *changed
	}

	encName, err := em.Encrypt(ctx, s.Name)
	if err != nil {
		return fmt.Errorf("encrypt name: %w", err)
	}

	// The pointer starts at the registration day itself, as if the record had
	// existed since then; RunDue's catch-up then generates the history.
	covered, err := subscription.PrevDay(*registered)
	if err != nil {
		return err
	}

	create := client.Subscription.Create().
		SetPublicID(prid.NewUnsafe("sub_")).
		SetName(encName.Ciphertext).
		SetEncryptionKeyID(encName.KeyID).
		SetRegisteredOn(*registered).
		SetAnchorOn(*registered).
		SetNextOccurrenceOn(*registered).
		SetCoveredThroughOn(covered).
		SetIntervalMonths(s.IntervalMonths)
	if s.Color != "" {
		if !graph.SubscriptionColor(s.Color).IsValid() {
			return fmt.Errorf("unknown color %q", s.Color)
		}
		create = create.SetColor(s.Color)
	}
	created, err := create.Save(ctx)
	if err != nil {
		return fmt.Errorf("save subscription: %w", err)
	}

	for j, e := range s.Entries {
		kind := graph.JournalEntryKind(e.Kind)
		if !kind.IsValid() {
			return fmt.Errorf("entries[%d]: invalid kind %q", j, e.Kind)
		}

		// Account names are encrypted in the DB, so resolution goes through
		// the name -> public ID map built while seeding the accounts.
		publicID, ok := accountMap[e.Account]
		if !ok {
			return fmt.Errorf("entries[%d]: unknown account %q", j, e.Account)
		}
		accountID, err := client.LedgerAccount.Query().
			Where(ledgeraccount.PublicID(publicID)).
			OnlyID(ctx)
		if err != nil {
			return fmt.Errorf("entries[%d]: resolve account %q: %w", j, e.Account, err)
		}

		_, err = client.SubscriptionEntry.Create().
			SetAmount(e.Amount).
			SetKind(schema.JournalEntryKind(e.Kind)).
			SetSubscriptionID(created.ID).
			SetLedgerAccountID(accountID).
			Save(ctx)
		if err != nil {
			return fmt.Errorf("entries[%d]: save template entry: %w", j, err)
		}
	}

	// Replay history up to the day the status last changed (or up to today
	// for a subscription that is still active).
	simUntil := today
	if status != schema.Active {
		simUntil = statusChangedOn
	}
	if err := sm.RunDue(ctx, client, created, simUntil); err != nil {
		return fmt.Errorf("replay history: %w", err)
	}

	switch status {
	case schema.Paused:
		// Paused at statusChangedOn; the daily job has kept skipping since.
		if _, err := client.Subscription.UpdateOneID(created.ID).
			SetStatus(schema.Paused).
			Save(ctx); err != nil {
			return fmt.Errorf("set status paused: %w", err)
		}
		reloaded, err := client.Subscription.Get(ctx, created.ID)
		if err != nil {
			return fmt.Errorf("reload subscription: %w", err)
		}
		if err := sm.RunDue(ctx, client, reloaded, today); err != nil {
			return fmt.Errorf("replay skips: %w", err)
		}
	case schema.Canceled:
		// Canceled at statusChangedOn; the pointer freezes there.
		if _, err := client.Subscription.UpdateOneID(created.ID).
			SetStatus(schema.Canceled).
			Save(ctx); err != nil {
			return fmt.Errorf("set status canceled: %w", err)
		}
	case schema.Active:
		// Already replayed to today.
	}

	logging.Info(ctx, "created subscription",
		"name", s.Name,
		"id", created.PublicID,
		"status", string(status),
	)
	return nil
}
