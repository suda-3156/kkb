package aggregation

import (
	"context"
	"fmt"
	"sort"

	"entgo.io/ent/dialect/sql"
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/journalentry"
	"github.com/suda-3156/kkb/go/ent/ledgeraccount"
	ents "github.com/suda-3156/kkb/go/ent/schema"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

type lacAmountRow struct {
	LedgerAccountID int    `json:"ledger_account_journal_entries"`
	Sum             int32  `json:"sum"`
	Kind            string `json:"kind"` // "DEBIT" or "CREDIT"
}

// datedLacAmountRow is a lacAmountRow that remembers the transaction date its
// amount was booked on. Carrying the date is what lets one query serve a whole
// series of periods: the rows are cut into buckets afterwards, in Go.
type datedLacAmountRow struct {
	Date            string `json:"date"`
	LedgerAccountID int    `json:"ledger_account_journal_entries"`
	Sum             int32  `json:"sum"`
	Kind            string `json:"kind"`
}

func (r datedLacAmountRow) undated() lacAmountRow {
	return lacAmountRow{
		LedgerAccountID: r.LedgerAccountID,
		Sum:             r.Sum,
		Kind:            r.Kind,
	}
}

func (m *AggregationManager) GetPeriodAggregation(
	ctx context.Context,
	startDate date.Date,
	endDate date.Date,
) (*graph.PeriodAggregation, error) {
	rows, err := m.sumByDate(ctx, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: %w", err)
	}

	// Return an empty aggregation when there are no entries in the range.
	if len(rows) == 0 {
		return emptyPeriodAggregation(startDate, endDate), nil
	}

	kinds, err := m.ledgerAccountKinds(ctx, rows)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: %w", err)
	}

	// One period, so every row belongs to the same bucket. Folding per account
	// is what nets the dates back together.
	undated := make([]lacAmountRow, 0, len(rows))
	for _, row := range rows {
		undated = append(undated, row.undated())
	}

	agg, err := foldPeriodAggregation(startDate, endDate, undated, kinds)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: %w", err)
	}
	return agg, nil
}

// sumByDate sums journal entry amounts per (transaction date, ledger account,
// entry kind) over the whole range, in a single round trip.
//
// The finest bucket a series can ask for is a day, so a day is as far as the
// database needs to aggregate. Everything coarser is folded from these rows in
// Go, which keeps the bucket boundaries defined in exactly one place
// (splitPeriods) instead of once there and once in SQL.
func (m *AggregationManager) sumByDate(
	ctx context.Context,
	startDate date.Date,
	endDate date.Date,
) ([]datedLacAmountRow, error) {
	// The dates live on transactions, so the aggregation has to join. ent has no
	// query builder for that, so the join is added to the selector from inside
	// the first aggregate function - the documented escape hatch, the same one
	// LastUsedByIDs uses. Grouping by a joined column works because the
	// generated scan runs the aggregate functions first and appends the query's
	// own group fields to the GROUP BY afterwards.
	txns := sql.Table(transaction.Table)

	var rows []datedLacAmountRow
	err := m.db.Client.JournalEntry.Query().
		GroupBy(journalentry.LedgerAccountColumn, journalentry.FieldKind).
		Aggregate(
			func(s *sql.Selector) string {
				s.Join(txns).On(s.C(journalentry.TransactionColumn), txns.C(transaction.FieldID))
				// transaction.date is char(10), so this is a string comparison.
				// ISO 8601 dates sort lexically the way they sort as dates,
				// which is what makes the range mean what it reads like.
				s.Where(sql.And(
					sql.GTE(txns.C(transaction.FieldDate), startDate.String()),
					sql.LTE(txns.C(transaction.FieldDate), endDate.String()),
				))
				s.GroupBy(txns.C(transaction.FieldDate))
				return sql.As(txns.C(transaction.FieldDate), "date")
			},
			ent.Sum(journalentry.FieldAmount),
		).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("aggregate journal entries: %w", err)
	}

	return rows, nil
}

// ledgerAccountKinds returns the kind of every ledger account the rows mention,
// which is what the arithmetic keys off.
//
// Archived accounts are looked up too: they take no new entries, but the ones
// they already carry still belong in the aggregation of a past period.
func (m *AggregationManager) ledgerAccountKinds(
	ctx context.Context,
	rows []datedLacAmountRow,
) (map[int]ents.LedgerAccountKind, error) {
	// An account appears once per (date, entry kind), so the IDs need deduping
	// before they become an IN list.
	seen := make(map[int]struct{}, len(rows))
	lacIDs := make([]int, 0, len(rows))
	for _, row := range rows {
		if _, ok := seen[row.LedgerAccountID]; ok {
			continue
		}
		seen[row.LedgerAccountID] = struct{}{}
		lacIDs = append(lacIDs, row.LedgerAccountID)
	}

	ledgerAccounts, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.IDIn(lacIDs...)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("query ledger accounts: %w", err)
	}

	kinds := make(map[int]ents.LedgerAccountKind, len(ledgerAccounts))
	for _, lac := range ledgerAccounts {
		kinds[lac.ID] = lac.Kind
	}

	return kinds, nil
}

func emptyPeriodAggregation(startDate, endDate date.Date) *graph.PeriodAggregation {
	return &graph.PeriodAggregation{
		StartDate: startDate,
		EndDate:   endDate,
		Expenses:  &graph.ExpenseSummary{},
		Revenue:   &graph.RevenueSummary{},
		NetAmount: 0,
	}
}

// foldPeriodAggregation turns the per-(account, kind) sums into the expense and
// revenue summaries of one period. An account may appear on both sides, so the
// rows are folded per account before being apportioned.
//
// Only expense and revenue accounts take part: asset, liability and equity
// movements are the counter entries of those, and counting them would double
// the totals.
func foldPeriodAggregation(
	startDate date.Date,
	endDate date.Date,
	rows []lacAmountRow,
	kinds map[int]ents.LedgerAccountKind,
) (*graph.PeriodAggregation, error) {
	response := emptyPeriodAggregation(startDate, endDate)

	expenses := make(map[int]int32) // ledger account ID -> signed total
	revenue := make(map[int]int32)

	for _, row := range rows {
		kind, ok := kinds[row.LedgerAccountID]
		if !ok {
			return nil, fmt.Errorf("ledger account not found for ID %d", row.LedgerAccountID)
		}

		amount := signedAmount(kind, row.Kind, row.Sum)

		switch kind {
		case ents.Expense:
			expenses[row.LedgerAccountID] += amount
			response.Expenses.TotalAmount += amount
		case ents.Revenue:
			revenue[row.LedgerAccountID] += amount
			response.Revenue.TotalAmount += amount
		case ents.Asset, ents.Liability, ents.Equity:
			continue
		}
	}

	response.Expenses.ByAccount = byAccountSummaries(expenses, response.Expenses.TotalAmount)
	response.Revenue.ByAccount = byAccountSummaries(revenue, response.Revenue.TotalAmount)
	response.NetAmount = response.Revenue.TotalAmount - response.Expenses.TotalAmount

	return response, nil
}

// byAccountSummaries builds the per-account breakdown, sorted by ledger account
// ID so that identical inputs always produce identical output (Go map iteration
// order is randomized).
func byAccountSummaries(amounts map[int]int32, total int32) []*graph.AccountAmountSummary {
	if len(amounts) == 0 {
		return nil
	}

	lacIDs := make([]int, 0, len(amounts))
	for lacID := range amounts {
		lacIDs = append(lacIDs, lacID)
	}
	sort.Ints(lacIDs)

	summaries := make([]*graph.AccountAmountSummary, 0, len(lacIDs))
	for _, lacID := range lacIDs {
		summaries = append(summaries, &graph.AccountAmountSummary{
			LedgerAccount: &graph.LedgerAccount{IntID: lacID},
			TotalAmount:   amounts[lacID],
			Ratio:         ratio(amounts[lacID], total),
		})
	}
	return summaries
}
