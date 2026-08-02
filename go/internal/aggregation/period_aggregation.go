package aggregation

import (
	"context"
	"fmt"
	"sort"

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

func (m *AggregationManager) GetPeriodAggregation(
	ctx context.Context,
	startDate date.Date,
	endDate date.Date,
) (*graph.PeriodAggregation, error) {
	// Sum journal entry amounts per ledger account, filtered by transaction date.
	var rows []lacAmountRow
	err := m.db.Client.JournalEntry.Query().
		Where(
			journalentry.HasTransactionWith(
				transaction.DateGTE(startDate),
				transaction.DateLTE(endDate),
			),
		).
		GroupBy(journalentry.LedgerAccountColumn, journalentry.FieldKind).
		Aggregate(ent.Sum(journalentry.FieldAmount)).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: aggregate journal entries: %w", err)
	}

	// Return an empty aggregation when there are no entries in the range.
	if len(rows) == 0 {
		return emptyPeriodAggregation(startDate, endDate), nil
	}

	// Fetch the kind of every ledger account involved; the arithmetic below
	// keys off it.
	lacIDs := make([]int, 0, len(rows))
	for _, row := range rows {
		lacIDs = append(lacIDs, row.LedgerAccountID)
	}

	ledgerAccounts, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.IDIn(lacIDs...)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: query ledger accounts: %w", err)
	}

	kinds := make(map[int]ents.LedgerAccountKind, len(ledgerAccounts))
	for _, lac := range ledgerAccounts {
		kinds[lac.ID] = lac.Kind
	}

	agg, err := foldPeriodAggregation(startDate, endDate, rows, kinds)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: %w", err)
	}
	return agg, nil
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
