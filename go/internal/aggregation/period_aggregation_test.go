package aggregation

import (
	"math"
	"slices"
	"testing"

	ents "github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

const (
	testStart = date.Date("2026-08-01")
	testEnd   = date.Date("2026-08-31")
)

// summaryOf flattens a breakdown into (ledger account ID, amount, ratio)
// triples so tests can assert on order as well as content.
type summary struct {
	lacID  int
	amount int32
	ratio  float64
}

func summariesOf(byAccount []*graph.AccountAmountSummary) []summary {
	out := make([]summary, 0, len(byAccount))
	for _, s := range byAccount {
		out = append(out, summary{s.LedgerAccount.IntID, s.TotalAmount, s.Ratio})
	}
	return out
}

func TestFoldPeriodAggregation(t *testing.T) {
	t.Run("splits expense and revenue, ignoring their counter entries", func(t *testing.T) {
		kinds := map[int]ents.LedgerAccountKind{
			1: ents.Expense,   // 食費
			2: ents.Expense,   // 日用品
			3: ents.Revenue,   // 給与
			4: ents.Asset,     // 銀行口座 (counter entry)
			5: ents.Liability, // クレカ (counter entry)
			6: ents.Equity,
		}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(2, ents.Debit, 1000),
			row(3, ents.Credit, 250000),
			row(4, ents.Debit, 250000),
			row(5, ents.Credit, 4000),
			row(6, ents.Credit, 100),
		}

		got, err := foldPeriodAggregation(testStart, testEnd, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregation() unexpected error: %v", err)
		}

		if got.StartDate != testStart || got.EndDate != testEnd {
			t.Errorf("period = %s..%s, want %s..%s",
				got.StartDate, got.EndDate, testStart, testEnd)
		}
		if got.Expenses.TotalAmount != 4000 {
			t.Errorf("expenses total = %d, want 4000", got.Expenses.TotalAmount)
		}
		if got.Revenue.TotalAmount != 250000 {
			t.Errorf("revenue total = %d, want 250000", got.Revenue.TotalAmount)
		}
		if got.NetAmount != 246000 {
			t.Errorf("net amount = %d, want 246000 (revenue - expenses)", got.NetAmount)
		}

		wantExpenses := []summary{{1, 3000, 0.75}, {2, 1000, 0.25}}
		if s := summariesOf(got.Expenses.ByAccount); !slices.Equal(s, wantExpenses) {
			t.Errorf("expenses by account = %+v, want %+v", s, wantExpenses)
		}
		wantRevenue := []summary{{3, 250000, 1}}
		if s := summariesOf(got.Revenue.ByAccount); !slices.Equal(s, wantRevenue) {
			t.Errorf("revenue by account = %+v, want %+v", s, wantRevenue)
		}
	})

	t.Run("folds both sides of the same account", func(t *testing.T) {
		// A refund credits the expense account it was originally debited to.
		kinds := map[int]ents.LedgerAccountKind{1: ents.Expense}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(1, ents.Credit, 500),
		}

		got, err := foldPeriodAggregation(testStart, testEnd, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregation() unexpected error: %v", err)
		}

		if got.Expenses.TotalAmount != 2500 {
			t.Errorf("expenses total = %d, want 2500", got.Expenses.TotalAmount)
		}
		if want := []summary{{1, 2500, 1}}; !slices.Equal(summariesOf(got.Expenses.ByAccount), want) {
			t.Errorf("expenses by account = %+v, want %+v", summariesOf(got.Expenses.ByAccount), want)
		}
	})

	// Regression: a fully refunded expense makes the total zero. The ratio used
	// to be computed unguarded, yielding NaN / ±Inf in the GraphQL Float output.
	t.Run("a zero total yields finite ratios", func(t *testing.T) {
		kinds := map[int]ents.LedgerAccountKind{1: ents.Expense, 2: ents.Expense}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(1, ents.Credit, 3000),
			row(2, ents.Debit, 1000),
			row(2, ents.Credit, 1000),
		}

		got, err := foldPeriodAggregation(testStart, testEnd, rows, kinds)
		if err != nil {
			t.Fatalf("foldPeriodAggregation() unexpected error: %v", err)
		}

		if got.Expenses.TotalAmount != 0 {
			t.Fatalf("expenses total = %d, want 0", got.Expenses.TotalAmount)
		}
		for _, s := range got.Expenses.ByAccount {
			if math.IsNaN(s.Ratio) || math.IsInf(s.Ratio, 0) {
				t.Errorf("account %d ratio = %v, must be a finite number", s.LedgerAccount.IntID, s.Ratio)
			}
		}
	})

	// Regression: the breakdown used to be built by ranging over a map, so the
	// order of byAccount changed between identical requests.
	t.Run("orders the breakdown by ledger account ID", func(t *testing.T) {
		kinds := map[int]ents.LedgerAccountKind{}
		var rows []lacAmountRow
		for lacID := 20; lacID >= 1; lacID-- {
			kinds[lacID] = ents.Expense
			rows = append(rows, row(lacID, ents.Debit, int32(lacID*100)))
		}

		for range 5 {
			got, err := foldPeriodAggregation(testStart, testEnd, rows, kinds)
			if err != nil {
				t.Fatalf("foldPeriodAggregation() unexpected error: %v", err)
			}
			prev := 0
			for _, s := range got.Expenses.ByAccount {
				if s.LedgerAccount.IntID <= prev {
					t.Fatalf("byAccount is not sorted ascending: %v after %d",
						s.LedgerAccount.IntID, prev)
				}
				prev = s.LedgerAccount.IntID
			}
		}
	})

	t.Run("no rows", func(t *testing.T) {
		got, err := foldPeriodAggregation(testStart, testEnd, nil, nil)
		if err != nil {
			t.Fatalf("foldPeriodAggregation() unexpected error: %v", err)
		}
		if got.Expenses.TotalAmount != 0 || got.Revenue.TotalAmount != 0 || got.NetAmount != 0 {
			t.Errorf("got %+v, want an all-zero aggregation", got)
		}
		if len(got.Expenses.ByAccount) != 0 || len(got.Revenue.ByAccount) != 0 {
			t.Errorf("got a breakdown for an empty period: %+v", got)
		}
	})

	t.Run("unknown ledger account", func(t *testing.T) {
		rows := []lacAmountRow{row(99, ents.Debit, 100)}
		if _, err := foldPeriodAggregation(testStart, testEnd, rows, nil); err == nil {
			t.Error("foldPeriodAggregation() error = nil, want an error for the unknown account")
		}
	})
}
