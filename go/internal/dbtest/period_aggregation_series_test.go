//go:build integration

package dbtest

import (
	"reflect"
	"testing"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

// A series is aggregated by one query over the whole range and cut into buckets
// afterwards, so what it asks the database for no longer matches what a bucket
// asks on its own. These cases pin the two together: the same buckets, the same
// amounts, and the empty periods that a single query cannot return rows for.
//
// As elsewhere in this package, each test books its rows in a year of its own.

// The per-period implementation is the definition of a bucket's contents. Rather
// than writing the expected numbers out again, each bucket of the series is
// compared against the single-period aggregation of the same dates.
func TestGetPeriodAggregationSeries_MatchesPerPeriodAggregation(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	revenue := newAccount(t, graph.LedgerAccountKindRevenue)
	asset := newAccount(t, graph.LedgerAccountKindAsset)

	// Several entries per month, both sides of the expense account, and a month
	// (March) with nothing at all.
	newTransaction(t, "2051-01-05", debit(expense, 300), credit(asset, 300))
	newTransaction(t, "2051-01-31", debit(expense, 120), credit(asset, 120))
	newTransaction(t, "2051-02-01", debit(asset, 4000), credit(revenue, 4000))
	newTransaction(t, "2051-02-14", credit(expense, 50), debit(asset, 50)) // a refund
	newTransaction(t, "2051-04-30", debit(expense, 900), credit(asset, 900))

	start, end := mustDate(t, "2051-01-01"), mustDate(t, "2051-04-30")

	got, err := testAM.GetPeriodAggregationSeries(t.Context(), start, end, graph.GranularityMonthly)
	if err != nil {
		t.Fatalf("GetPeriodAggregationSeries() failed: %v", err)
	}

	wantBuckets := [][2]string{
		{"2051-01-01", "2051-01-31"},
		{"2051-02-01", "2051-02-28"},
		{"2051-03-01", "2051-03-31"},
		{"2051-04-01", "2051-04-30"},
	}
	if len(got.DataPoints) != len(wantBuckets) {
		t.Fatalf("got %d data points, want %d", len(got.DataPoints), len(wantBuckets))
	}

	for i, bucket := range wantBuckets {
		dp := got.DataPoints[i]
		if dp.StartDate != date.Date(bucket[0]) || dp.EndDate != date.Date(bucket[1]) {
			t.Errorf("data point %d covers %s..%s, want %s..%s",
				i, dp.StartDate, dp.EndDate, bucket[0], bucket[1])
			continue
		}

		want, err := testAM.GetPeriodAggregation(t.Context(), dp.StartDate, dp.EndDate)
		if err != nil {
			t.Fatalf("GetPeriodAggregation(%s, %s) failed: %v", dp.StartDate, dp.EndDate, err)
		}

		if !reflect.DeepEqual(dp, want) {
			t.Errorf("data point %d (%s..%s) = %+v, want %+v", i, bucket[0], bucket[1], dp, want)
		}
	}
}

// The single query returns no row for a period with no entries, so the empty
// buckets are put back from the bucket list. A series that dropped them would
// still look plausible: it would just have fewer points, each shifted onto the
// wrong date.
func TestGetPeriodAggregationSeries_KeepsEmptyBuckets(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	asset := newAccount(t, graph.LedgerAccountKindAsset)

	// Only the middle day of the five has any entry.
	newTransaction(t, "2061-06-03", debit(expense, 250), credit(asset, 250))

	got, err := testAM.GetPeriodAggregationSeries(t.Context(),
		mustDate(t, "2061-06-01"), mustDate(t, "2061-06-05"), graph.GranularityDaily)
	if err != nil {
		t.Fatalf("GetPeriodAggregationSeries() failed: %v", err)
	}

	if len(got.DataPoints) != 5 {
		t.Fatalf("got %d data points, want 5 (one per day)", len(got.DataPoints))
	}

	for i, dp := range got.DataPoints {
		want := date.Date([]string{"2061-06-01", "2061-06-02", "2061-06-03", "2061-06-04", "2061-06-05"}[i])
		if dp.StartDate != want || dp.EndDate != want {
			t.Errorf("data point %d covers %s..%s, want %s only", i, dp.StartDate, dp.EndDate, want)
		}

		if i == 2 {
			if dp.Expenses.TotalAmount != 250 {
				t.Errorf("data point %d expenses = %d, want 250", i, dp.Expenses.TotalAmount)
			}
			continue
		}

		if dp.Expenses.TotalAmount != 0 || dp.Revenue.TotalAmount != 0 || dp.NetAmount != 0 {
			t.Errorf("data point %d totals = (expenses %d, revenue %d, net %d), want all zero",
				i, dp.Expenses.TotalAmount, dp.Revenue.TotalAmount, dp.NetAmount)
		}
		if dp.Expenses.ByAccount != nil || dp.Revenue.ByAccount != nil {
			t.Errorf("data point %d has a breakdown for an empty day: %+v", i, dp)
		}
	}
}

// The range of the query and the range of the buckets are now two separate
// things, so an off-by-one in either shows up as money landing outside the
// series or in the wrong bucket. transaction.date is char(10): the comparison
// is lexical.
func TestGetPeriodAggregationSeries_RangeIsInclusive(t *testing.T) {
	expense := newAccount(t, graph.LedgerAccountKindExpense)
	asset := newAccount(t, graph.LedgerAccountKindAsset)

	for _, on := range []string{
		"2070-12-31", // the day before the range
		"2071-01-01", // the first day of the range, and of the first bucket
		"2071-01-08", // the first day of the second bucket
		"2071-01-14", // the last day of the range
		"2071-01-15", // the day after the range
	} {
		newTransaction(t, on, debit(expense, 100), credit(asset, 100))
	}

	got, err := testAM.GetPeriodAggregationSeries(t.Context(),
		mustDate(t, "2071-01-01"), mustDate(t, "2071-01-14"), graph.GranularityWeekly)
	if err != nil {
		t.Fatalf("GetPeriodAggregationSeries() failed: %v", err)
	}

	if len(got.DataPoints) != 2 {
		t.Fatalf("got %d data points, want 2 (two weeks)", len(got.DataPoints))
	}

	// One entry in the first week, two in the second, and neither neighbor of
	// the range anywhere.
	if want := int32(100); got.DataPoints[0].Expenses.TotalAmount != want {
		t.Errorf("first week expenses = %d, want %d", got.DataPoints[0].Expenses.TotalAmount, want)
	}
	if want := int32(200); got.DataPoints[1].Expenses.TotalAmount != want {
		t.Errorf("second week expenses = %d, want %d", got.DataPoints[1].Expenses.TotalAmount, want)
	}
}

// An empty range asks for nothing, so it must not reach the database at all.
// The old implementation got this for free by looping over zero periods.
func TestGetPeriodAggregationSeries_EndBeforeStart(t *testing.T) {
	got, err := testAM.GetPeriodAggregationSeries(t.Context(),
		mustDate(t, "2081-08-10"), mustDate(t, "2081-08-01"), graph.GranularityDaily)
	if err != nil {
		t.Fatalf("GetPeriodAggregationSeries() failed: %v", err)
	}

	if len(got.DataPoints) != 0 {
		t.Errorf("got %d data points, want none", len(got.DataPoints))
	}
	if got.Granularity != graph.GranularityDaily {
		t.Errorf("granularity = %s, want %s", got.Granularity, graph.GranularityDaily)
	}
}
