//go:build integration

package dbtest

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	entsubscription "github.com/suda-3156/kkb/go/ent/subscription"
	"github.com/suda-3156/kkb/go/ent/subscriptionoccurrence"
	enttransaction "github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
	"github.com/suda-3156/kkb/go/internal/subscription"
	subscriptionstask "github.com/suda-3156/kkb/go/internal/tasks/subscriptions"
)

// These tests cover the request-spanning behavior a pure test cannot reach:
// RunDue's catch-up and idempotency against real rows, the unique constraint
// as the second line of defense, and the three paths that must respect the
// invariant "nextOccurrenceOn > last materialized day" (interval change,
// registered-day change, reactivation).
//
// Simulated timelines use 2031-2033 dates; the aggregation tests use 2051+.
// Fixtures that go through the real clock (the reactivation rule reads
// TodayJST) derive their dates from it explicitly.

// newSubscriptionAt writes a subscription definition whose pointer sits at
// registeredOn, as if the record had existed since that day; RunDue's catch-up
// then replays its history (the seed tool does the same). Status is changed
// through ent directly where a manager verb would consult the real clock.
func newSubscriptionAt(
	t *testing.T,
	registeredOn string,
	intervalMonths int,
	expense, counter *graph.LedgerAccount,
	amount int32,
) *ent.Subscription {
	t.Helper()
	ctx := t.Context()

	registered := mustDate(t, registeredOn)
	covered, err := subscription.PrevDay(registered)
	if err != nil {
		t.Fatalf("prev day of %s: %v", registeredOn, err)
	}

	encName, err := testEM.Encrypt(ctx, t.Name())
	if err != nil {
		t.Fatalf("encrypt name: %v", err)
	}

	sub, err := testDB.Client.Subscription.Create().
		SetPublicID(prid.NewUnsafe("sub_")).
		SetName(encName.Ciphertext).
		SetEncryptionKeyID(encName.KeyID).
		SetRegisteredOn(registered).
		SetAnchorOn(registered).
		SetNextOccurrenceOn(registered).
		SetCoveredThroughOn(covered).
		SetIntervalMonths(intervalMonths).
		Save(ctx)
	if err != nil {
		t.Fatalf("create subscription: %v", err)
	}

	for _, e := range []struct {
		account *graph.LedgerAccount
		kind    schema.JournalEntryKind
	}{
		{expense, schema.Debit},
		{counter, schema.Credit},
	} {
		_, err := testDB.Client.SubscriptionEntry.Create().
			SetAmount(amount).
			SetKind(e.kind).
			SetSubscriptionID(sub.ID).
			SetLedgerAccountID(e.account.IntID).
			Save(ctx)
		if err != nil {
			t.Fatalf("create template entry: %v", err)
		}
	}

	return sub
}

// runDue drives RunDue the way the daily job does: reload inside a
// transaction, then advance up to the given day.
func runDue(t *testing.T, subID int, today string) {
	t.Helper()

	err := testDB.Client.WithTx(t.Context(), func(ctx context.Context, client *ent.Client) error {
		sub, err := client.Subscription.Query().
			Where(entsubscription.ID(subID)).
			ForUpdate().
			Only(ctx)
		if err != nil {
			return err
		}
		return testSM.RunDue(ctx, client, sub, mustDate(t, today))
	})
	if err != nil {
		t.Fatalf("run due until %s: %v", today, err)
	}
}

func reloadSub(t *testing.T, subID int) *ent.Subscription {
	t.Helper()

	sub, err := testDB.Client.Subscription.Get(t.Context(), subID)
	if err != nil {
		t.Fatalf("reload subscription: %v", err)
	}
	return sub
}

// occurrencesOf returns "date outcome" strings in date order, which makes the
// expected history a readable one-liner in assertions.
func occurrencesOf(t *testing.T, subID int) []string {
	t.Helper()

	occs, err := testDB.Client.SubscriptionOccurrence.Query().
		Where(subscriptionoccurrence.HasSubscriptionWith(entsubscription.ID(subID))).
		Order(ent.Asc(subscriptionoccurrence.FieldOccurrenceOn)).
		All(t.Context())
	if err != nil {
		t.Fatalf("query occurrences: %v", err)
	}

	result := make([]string, 0, len(occs))
	for _, occ := range occs {
		result = append(result, occ.OccurrenceOn.String()+" "+string(occ.Outcome))
	}
	return result
}

func transactionDatesOf(t *testing.T, subID int) []string {
	t.Helper()

	txns, err := testDB.Client.Transaction.Query().
		Where(enttransaction.HasSubscriptionWith(entsubscription.ID(subID))).
		Order(ent.Asc(enttransaction.FieldDate)).
		All(t.Context())
	if err != nil {
		t.Fatalf("query transactions: %v", err)
	}

	result := make([]string, 0, len(txns))
	for _, txn := range txns {
		result = append(result, txn.Date.String())
	}
	return result
}

func assertPointer(t *testing.T, subID int, wantNext, wantCovered string) {
	t.Helper()

	sub := reloadSub(t, subID)
	if sub.NextOccurrenceOn != mustDate(t, wantNext) {
		t.Errorf("nextOccurrenceOn = %s, want %s", sub.NextOccurrenceOn, wantNext)
	}
	if sub.CoveredThroughOn != mustDate(t, wantCovered) {
		t.Errorf("coveredThroughOn = %s, want %s", sub.CoveredThroughOn, wantCovered)
	}
}

func assertHistory(t *testing.T, subID int, want ...string) {
	t.Helper()

	got := occurrencesOf(t, subID)
	if strings.Join(got, ", ") != strings.Join(want, ", ") {
		t.Errorf("occurrences = [%s], want [%s]", strings.Join(got, ", "), strings.Join(want, ", "))
	}
}

// TestRunDue_CatchUpIsIdempotent replays a month-end anchor through a clamped
// February and checks that a second run with the same "today" changes nothing.
func TestRunDue_CatchUpIsIdempotent(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	sub := newSubscriptionAt(t, "2031-01-31", 1, expense, counter, 1200)

	runDue(t, sub.ID, "2031-03-31")

	// Sticky rounding against real SQL: February clamps, March returns to 31.
	assertHistory(t, sub.ID,
		"2031-01-31 MATERIALIZED",
		"2031-02-28 MATERIALIZED",
		"2031-03-31 MATERIALIZED",
	)
	if got := transactionDatesOf(t, sub.ID); strings.Join(got, ",") != "2031-01-31,2031-02-28,2031-03-31" {
		t.Errorf("transaction dates = %v", got)
	}
	assertPointer(t, sub.ID, "2031-04-30", "2031-04-29")

	// Second run, same day: the pointer is already past today, nothing happens.
	runDue(t, sub.ID, "2031-03-31")

	assertHistory(t, sub.ID,
		"2031-01-31 MATERIALIZED",
		"2031-02-28 MATERIALIZED",
		"2031-03-31 MATERIALIZED",
	)
	assertPointer(t, sub.ID, "2031-04-30", "2031-04-29")
}

// TestRunDue_PauseSkipsWithoutExtendingCovered pauses after one payment and
// checks that skips advance the pointer but never the covered period.
func TestRunDue_PauseSkipsWithoutExtendingCovered(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	sub := newSubscriptionAt(t, "2031-05-10", 1, expense, counter, 980)

	runDue(t, sub.ID, "2031-05-10")
	assertPointer(t, sub.ID, "2031-06-10", "2031-06-09")

	if _, err := testDB.Client.Subscription.UpdateOneID(sub.ID).
		SetStatus(schema.Paused).
		Save(t.Context()); err != nil {
		t.Fatalf("pause: %v", err)
	}

	runDue(t, sub.ID, "2031-07-15")

	assertHistory(t, sub.ID,
		"2031-05-10 MATERIALIZED",
		"2031-06-10 SKIPPED",
		"2031-07-10 SKIPPED",
	)
	// The pointer moved on, the paid-through day did not, and no transaction
	// was created for the skipped months.
	assertPointer(t, sub.ID, "2031-08-10", "2031-06-09")
	if got := transactionDatesOf(t, sub.ID); strings.Join(got, ",") != "2031-05-10" {
		t.Errorf("transaction dates = %v, want only the materialized month", got)
	}
}

// TestRunDue_UpgradesSameDaySkip resumes on the very day an occurrence was
// skipped: the SKIPPED row is upgraded in place, not duplicated.
func TestRunDue_UpgradesSameDaySkip(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	sub := newSubscriptionAt(t, "2031-09-05", 1, expense, counter, 500)

	runDue(t, sub.ID, "2031-09-05")

	if _, err := testDB.Client.Subscription.UpdateOneID(sub.ID).
		SetStatus(schema.Paused).
		Save(t.Context()); err != nil {
		t.Fatalf("pause: %v", err)
	}
	runDue(t, sub.ID, "2031-10-05")
	assertHistory(t, sub.ID,
		"2031-09-05 MATERIALIZED",
		"2031-10-05 SKIPPED",
	)

	// Same-day resume: the reactivation rule (max(today, covered+1) with
	// covered = 2031-10-04) points back at the skipped day.
	if _, err := testDB.Client.Subscription.UpdateOneID(sub.ID).
		SetStatus(schema.Active).
		SetNextOccurrenceOn(mustDate(t, "2031-10-05")).
		SetAnchorOn(mustDate(t, "2031-10-05")).
		Save(t.Context()); err != nil {
		t.Fatalf("simulate same-day resume: %v", err)
	}

	runDue(t, sub.ID, "2031-10-05")

	assertHistory(t, sub.ID,
		"2031-09-05 MATERIALIZED",
		"2031-10-05 MATERIALIZED", // upgraded, still a single row
	)
	if got := transactionDatesOf(t, sub.ID); strings.Join(got, ",") != "2031-09-05,2031-10-05" {
		t.Errorf("transaction dates = %v", got)
	}
	assertPointer(t, sub.ID, "2031-11-05", "2031-11-04")
}

// TestOccurrenceUniqueConstraint proves the DB-level second line of defense:
// two log rows for the same (subscription, day) cannot exist.
func TestOccurrenceUniqueConstraint(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	sub := newSubscriptionAt(t, "2031-12-01", 1, expense, counter, 300)

	if _, err := testDB.Client.SubscriptionOccurrence.Create().
		SetOccurrenceOn(mustDate(t, "2031-12-01")).
		SetOutcome(schema.Materialized).
		SetSubscriptionID(sub.ID).
		Save(t.Context()); err != nil {
		t.Fatalf("first occurrence row: %v", err)
	}

	_, err := testDB.Client.SubscriptionOccurrence.Create().
		SetOccurrenceOn(mustDate(t, "2031-12-01")).
		SetOutcome(schema.Skipped).
		SetSubscriptionID(sub.ID).
		Save(t.Context())
	if !ent.IsConstraintError(err) {
		t.Fatalf("duplicate occurrence row: err = %v, want a constraint error", err)
	}
}

// TestUpdate_IntervalChangeTakesEffectFromNextOccurrence covers invariant
// path 1: changing the interval must not move the current pointer; the new
// stride applies from the next materialization on.
func TestUpdate_IntervalChangeTakesEffectFromNextOccurrence(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	sub := newSubscriptionAt(t, "2032-01-20", 1, expense, counter, 700)

	runDue(t, sub.ID, "2032-01-20")
	assertPointer(t, sub.ID, "2032-02-20", "2032-02-19")

	converted, err := testSM.GetByPublicID(t.Context(), sub.PublicID)
	if err != nil {
		t.Fatalf("get subscription: %v", err)
	}

	three := int32(3)
	if _, err := testSM.Update(t.Context(), graph.UpdateSubscriptionInput{
		ID:             sub.PublicID,
		IntervalMonths: &three,
		UpdatedAt:      converted.UpdatedAt,
	}); err != nil {
		t.Fatalf("update interval: %v", err)
	}

	// The pointer did not move.
	assertPointer(t, sub.ID, "2032-02-20", "2032-02-19")

	// The next materialization strides 3 months.
	runDue(t, sub.ID, "2032-02-20")
	assertPointer(t, sub.ID, "2032-05-20", "2032-05-19")
}

// TestUpdate_RegisteredOnChange covers invariant path 2: with history the
// dates must not move; without history the schedule is re-derived with the
// creation rule.
func TestUpdate_RegisteredOnChange(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)

	t.Run("with history, only the recorded fact changes", func(t *testing.T) {
		sub := newSubscriptionAt(t, "2032-06-15", 1, expense, counter, 400)
		runDue(t, sub.ID, "2032-06-15")

		converted, err := testSM.GetByPublicID(t.Context(), sub.PublicID)
		if err != nil {
			t.Fatalf("get subscription: %v", err)
		}

		corrected := mustDate(t, "2032-06-01")
		if _, err := testSM.Update(t.Context(), graph.UpdateSubscriptionInput{
			ID:           sub.PublicID,
			RegisteredOn: &corrected,
			UpdatedAt:    converted.UpdatedAt,
		}); err != nil {
			t.Fatalf("update registeredOn: %v", err)
		}

		reloaded := reloadSub(t, sub.ID)
		if reloaded.RegisteredOn != corrected {
			t.Errorf("registeredOn = %s, want %s", reloaded.RegisteredOn, corrected)
		}
		// Anchor and pointer must not move past a materialized occurrence.
		if reloaded.AnchorOn != mustDate(t, "2032-06-15") {
			t.Errorf("anchorOn = %s, want unchanged 2032-06-15", reloaded.AnchorOn)
		}
		assertPointer(t, sub.ID, "2032-07-15", "2032-07-14")
	})

	t.Run("without history, the schedule is re-derived", func(t *testing.T) {
		// This path goes through the real clock, so the fixture dates derive
		// from it: both registration days lie in the future, which also keeps
		// createSubscription from materializing anything.
		firstOn := futureDate(t, 5)
		correctedOn := futureDate(t, 12)

		created, err := testSM.Create(t.Context(), graph.CreateSubscriptionInput{
			Name:           t.Name(),
			RegisteredOn:   firstOn,
			IntervalMonths: 1,
			Entries: []*graph.SubscriptionEntryInput{
				{LedgerAccountID: expense.ID, Amount: 650, Kind: graph.JournalEntryKindDebit},
				{LedgerAccountID: counter.ID, Amount: 650, Kind: graph.JournalEntryKindCredit},
			},
		})
		if err != nil {
			t.Fatalf("create subscription: %v", err)
		}
		if created.NextOccurrenceOn != firstOn {
			t.Fatalf("nextOccurrenceOn = %s, want the future anchor %s", created.NextOccurrenceOn, firstOn)
		}

		updated, err := testSM.Update(t.Context(), graph.UpdateSubscriptionInput{
			ID:           created.ID,
			RegisteredOn: &correctedOn,
			UpdatedAt:    created.UpdatedAt,
		})
		if err != nil {
			t.Fatalf("update registeredOn: %v", err)
		}

		if updated.AnchorOn != correctedOn {
			t.Errorf("anchorOn = %s, want re-derived %s", updated.AnchorOn, correctedOn)
		}
		if updated.NextOccurrenceOn != correctedOn {
			t.Errorf("nextOccurrenceOn = %s, want re-derived %s", updated.NextOccurrenceOn, correctedOn)
		}
	})
}

// TestReactivation covers invariant path 3 through the real manager verbs
// (which consult the real clock).
func TestReactivation(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)

	t.Run("covered period still running, dates stay put", func(t *testing.T) {
		registeredOn := futureDate(t, 7)

		created, err := testSM.Create(t.Context(), graph.CreateSubscriptionInput{
			Name:           t.Name(),
			RegisteredOn:   registeredOn,
			IntervalMonths: 1,
			Entries: []*graph.SubscriptionEntryInput{
				{LedgerAccountID: expense.ID, Amount: 800, Kind: graph.JournalEntryKindDebit},
				{LedgerAccountID: counter.ID, Amount: 800, Kind: graph.JournalEntryKindCredit},
			},
		})
		if err != nil {
			t.Fatalf("create subscription: %v", err)
		}

		if _, err := testSM.Pause(t.Context(), created.ID); err != nil {
			t.Fatalf("pause: %v", err)
		}
		resumed, err := testSM.Resume(t.Context(), created.ID)
		if err != nil {
			t.Fatalf("resume: %v", err)
		}

		if resumed.Status != graph.SubscriptionStatusActive {
			t.Errorf("status = %s, want ACTIVE", resumed.Status)
		}
		if resumed.NextOccurrenceOn != created.NextOccurrenceOn {
			t.Errorf("nextOccurrenceOn = %s, want unchanged %s",
				resumed.NextOccurrenceOn, created.NextOccurrenceOn)
		}
		if resumed.AnchorOn != created.AnchorOn {
			t.Errorf("anchorOn = %s, want unchanged %s", resumed.AnchorOn, created.AnchorOn)
		}
	})

	t.Run("covered period lapsed, billing restarts today", func(t *testing.T) {
		// Paused from the start, registered long ago: coveredThroughOn sits in
		// the past and no occurrence was ever recorded.
		sub := newSubscriptionAt(t, "2024-03-05", 1, expense, counter, 900)
		if _, err := testDB.Client.Subscription.UpdateOneID(sub.ID).
			SetStatus(schema.Paused).
			Save(t.Context()); err != nil {
			t.Fatalf("pause: %v", err)
		}

		resumed, err := testSM.Resume(t.Context(), sub.PublicID)
		if err != nil {
			t.Fatalf("resume: %v", err)
		}

		today := subscription.TodayJST()
		if resumed.NextOccurrenceOn != today {
			t.Errorf("nextOccurrenceOn = %s, want today %s", resumed.NextOccurrenceOn, today)
		}
		if resumed.AnchorOn != today {
			t.Errorf("anchorOn = %s, want moved to today %s", resumed.AnchorOn, today)
		}
		if resumed.Status != graph.SubscriptionStatusActive {
			t.Errorf("status = %s, want ACTIVE", resumed.Status)
		}
	})
}

// TestMaterializeDue_IsolatesFailures runs the task's sweep over one broken
// and one healthy subscription: the healthy one must advance, the broken one
// must roll back, and the sweep as a whole must fail.
func TestMaterializeDue_IsolatesFailures(t *testing.T) {
	ctx := t.Context()

	// This test drives the sweep, which scans every due subscription in the
	// shared database. Freeze the leftovers from the other tests so the
	// outcome only depends on the two fixtures below.
	if _, err := testDB.Client.Subscription.Update().
		SetStatus(schema.Canceled).
		Save(ctx); err != nil {
		t.Fatalf("cancel leftover subscriptions: %v", err)
	}

	expense := newAccount(t, graph.LedgerAccountKindExpense)
	counter := newAccount(t, graph.LedgerAccountKindLiability)
	archived := newAccount(t, graph.LedgerAccountKindExpense)

	broken := newSubscriptionAt(t, "2033-01-05", 1, archived, counter, 100)
	healthy := newSubscriptionAt(t, "2033-01-06", 1, expense, counter, 200)

	// Archive the account out from under the broken subscription's template.
	// The GraphQL path refuses this while the subscription runs, so it goes
	// through ent directly, standing in for any per-subscription failure.
	if _, err := testDB.Client.LedgerAccount.UpdateOneID(archived.IntID).
		SetArchivedAt(time.Now()).
		Save(ctx); err != nil {
		t.Fatalf("archive account: %v", err)
	}

	err := subscriptionstask.MaterializeDue(ctx, testSM, mustDate(t, "2033-01-10"))
	if err == nil {
		t.Fatal("MaterializeDue() = nil, want an error while any subscription fails")
	}

	// The healthy subscription advanced...
	assertHistory(t, healthy.ID, "2033-01-06 MATERIALIZED")
	assertPointer(t, healthy.ID, "2033-02-06", "2033-02-05")

	// ...and the broken one rolled back whole: no occurrence, no transaction,
	// pointer untouched.
	assertHistory(t, broken.ID)
	if got := transactionDatesOf(t, broken.ID); len(got) != 0 {
		t.Errorf("broken subscription has transactions %v, want none", got)
	}
	assertPointer(t, broken.ID, "2033-01-05", "2033-01-04")
}

func futureDate(t *testing.T, daysAhead int) date.Date {
	t.Helper()

	parsed, err := time.Parse("2006-01-02", subscription.TodayJST().String())
	if err != nil {
		t.Fatalf("parse today: %v", err)
	}
	return mustDate(t, parsed.AddDate(0, 0, daysAhead).Format("2006-01-02"))
}
