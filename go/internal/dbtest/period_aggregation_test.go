//go:build integration

package dbtest

import (
	"testing"

	graph "github.com/suda-3156/kkb/go/graph/model"
)

// These cases pin down what GetPeriodAggregation asks the database for: the
// inclusivity of the date range, the shape of the GROUP BY, and which account
// kinds take part. None of it is reachable from a pure test, because all three
// live in the SQL rather than in foldPeriodAggregation.
//
// The container is shared by the whole package and nothing truncates tables
// between tests, so every test below books its rows in a year of its own. Years
// are spaced a decade apart to leave room for the out-of-range rows that the
// boundary test needs.

// transaction.date is char(10), so GTE / LTE compare strings rather than dates.
// This pins the range to the endpoints an ISO date implies.
func TestGetPeriodAggregation_RangeIsInclusive(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	asset := newAccount(t, graph.LedgerAccountKindAsset)

	for _, on := range []string{
		"2010-12-31", // the day before the range
		"2011-01-01", // the first day of the range
		"2011-12-31", // the last day of the range
		"2012-01-01", // the day after the range
	} {
		newTransaction(t, on, debit(expense, 100), credit(asset, 100))
	}

	got, err := testAM.GetPeriodAggregation(t.Context(), mustDate(t, "2011-01-01"), mustDate(t, "2011-12-31"))
	if err != nil {
		t.Fatalf("GetPeriodAggregation() failed: %v", err)
	}

	// Both endpoints in, neither neighbor.
	if want := int32(200); got.Expenses.TotalAmount != want {
		t.Errorf("Expenses.TotalAmount = %d, want %d", got.Expenses.TotalAmount, want)
	}
}

// An account can appear on both sides of the ledger inside one period. The query
// groups by (account, kind), so each account arrives as two rows that have to
// net out against each other.
func TestGetPeriodAggregation_NetsBothSidesOfAnAccount(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	asset := newAccount(t, graph.LedgerAccountKindAsset)

	newTransaction(t, "2021-03-01", debit(expense, 500), credit(asset, 500))
	// A refund: the same expense account, on its non-normal side.
	newTransaction(t, "2021-03-02", credit(expense, 200), debit(asset, 200))

	got, err := testAM.GetPeriodAggregation(t.Context(), mustDate(t, "2021-01-01"), mustDate(t, "2021-12-31"))
	if err != nil {
		t.Fatalf("GetPeriodAggregation() failed: %v", err)
	}

	if want := int32(300); got.Expenses.TotalAmount != want {
		t.Errorf("Expenses.TotalAmount = %d, want %d", got.Expenses.TotalAmount, want)
	}

	amount, ok := amountOf(got.Expenses.ByAccount, expense)
	if !ok {
		t.Fatalf("Expenses.ByAccount does not contain the expense account (IntID %d)", expense.IntID)
	}
	if want := int32(300); amount != want {
		t.Errorf("Expenses.ByAccount[expense] = %d, want %d", amount, want)
	}
}

// Asset, liability and equity movements are the counter entries of the expense
// and revenue ones. Counting them would double every total.
func TestGetPeriodAggregation_ExcludesCounterEntryKinds(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	revenue := newAccount(t, graph.LedgerAccountKindRevenue)
	asset := newAccount(t, graph.LedgerAccountKindAsset)
	liability := newAccount(t, graph.LedgerAccountKindLiability)

	newTransaction(t, "2031-06-01", debit(expense, 300), credit(asset, 300))
	newTransaction(t, "2031-06-02", debit(asset, 700), credit(revenue, 700))
	newTransaction(t, "2031-06-03", debit(expense, 50), credit(liability, 50))

	got, err := testAM.GetPeriodAggregation(t.Context(), mustDate(t, "2031-01-01"), mustDate(t, "2031-12-31"))
	if err != nil {
		t.Fatalf("GetPeriodAggregation() failed: %v", err)
	}

	if want := int32(350); got.Expenses.TotalAmount != want {
		t.Errorf("Expenses.TotalAmount = %d, want %d", got.Expenses.TotalAmount, want)
	}
	if want := int32(700); got.Revenue.TotalAmount != want {
		t.Errorf("Revenue.TotalAmount = %d, want %d", got.Revenue.TotalAmount, want)
	}
	if want := int32(350); got.NetAmount != want {
		t.Errorf("NetAmount = %d, want %d", got.NetAmount, want)
	}

	for _, lac := range []*graph.LedgerAccount{asset, liability} {
		if amount, ok := amountOf(got.Expenses.ByAccount, lac); ok {
			t.Errorf("Expenses.ByAccount contains %s account (IntID %d, amount %d), want it excluded",
				lac.Kind, lac.IntID, amount)
		}
		if amount, ok := amountOf(got.Revenue.ByAccount, lac); ok {
			t.Errorf("Revenue.ByAccount contains %s account (IntID %d, amount %d), want it excluded",
				lac.Kind, lac.IntID, amount)
		}
	}
}

// A range with no entries takes the early return, which never looks up any
// ledger account. GetPeriodAggregationSeries leans on this for empty buckets.
func TestGetPeriodAggregation_EmptyRange(t *testing.T) {
	got, err := testAM.GetPeriodAggregation(t.Context(), mustDate(t, "2041-01-01"), mustDate(t, "2041-12-31"))
	if err != nil {
		t.Fatalf("GetPeriodAggregation() failed: %v", err)
	}

	if got.Expenses.TotalAmount != 0 || got.Revenue.TotalAmount != 0 || got.NetAmount != 0 {
		t.Errorf("totals = (expenses %d, revenue %d, net %d), want all zero",
			got.Expenses.TotalAmount, got.Revenue.TotalAmount, got.NetAmount)
	}
	if got.Expenses.ByAccount != nil || got.Revenue.ByAccount != nil {
		t.Errorf("ByAccount = (expenses %v, revenue %v), want both nil",
			got.Expenses.ByAccount, got.Revenue.ByAccount)
	}
	if got.StartDate != mustDate(t, "2041-01-01") || got.EndDate != mustDate(t, "2041-12-31") {
		t.Errorf("range = (%s, %s), want (2041-01-01, 2041-12-31)", got.StartDate, got.EndDate)
	}
}
