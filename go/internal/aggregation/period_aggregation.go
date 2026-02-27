package aggregation

import (
	"context"
	"fmt"

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
		return &graph.PeriodAggregation{
			StartDate: startDate,
			EndDate:   endDate,
			Expenses:  &graph.ExpenseSummary{},
			Revenue:   &graph.RevenueSummary{},
			NetAmount: 0,
		}, nil
	}

	// Fetch ledger account details for the involved ledger accounts.
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

	ledgerAccountMap := make(map[int]*ent.LedgerAccount) // ledger account ID -> ledger account details
	for _, lac := range ledgerAccounts {
		ledgerAccountMap[lac.ID] = lac
	}

	// Response
	response := &graph.PeriodAggregation{
		StartDate: startDate,
		EndDate:   endDate,
		Expenses:  &graph.ExpenseSummary{},
		Revenue:   &graph.RevenueSummary{},
	}

	// Process the expenses
	// One expense account may have up to two rows (debit and credit), so we need to combine them.
	expenseMap := make(map[int]int32) // ledger account ID -> total amount
	for _, row := range rows {
		lac, ok := ledgerAccountMap[row.LedgerAccountID]
		if !ok {
			return nil, fmt.Errorf("period aggregation: ledger account not found for ID %d", row.LedgerAccountID)
		}

		if lac.Kind != ents.Expense {
			continue
		}

		amount := row.Sum
		if row.Kind == ents.Credit.String() {
			amount = -amount
		}

		expenseMap[row.LedgerAccountID] += amount
		response.Expenses.TotalAmount += amount
	}

	// Populate the response with expense data
	for lacID, amount := range expenseMap {
		response.Expenses.TotalAmount += amount
		response.Expenses.ByAccount = append(
			response.Expenses.ByAccount,
			&graph.AccountAmountSummary{
				LedgerAccount: &graph.LedgerAccount{IntID: lacID},
				TotalAmount:   amount,
				Ratio:         float64(amount) / float64(response.Expenses.TotalAmount),
			})
	}

	// Process the revenue
	// Similar to expenses, one revenue account may have up to two rows (debit and credit).
	revenueMap := make(map[int]int32) // ledger account ID -> total amount
	for _, row := range rows {
		lac, ok := ledgerAccountMap[row.LedgerAccountID]
		if !ok {
			return nil, fmt.Errorf("period aggregation: ledger account not found for ID %d", row.LedgerAccountID)
		}

		if lac.Kind != ents.Revenue {
			continue
		}

		amount := row.Sum
		if row.Kind == ents.Debit.String() {
			amount = -amount
		}

		revenueMap[row.LedgerAccountID] += amount
		response.Revenue.TotalAmount += amount
	}

	// Populate the response with revenue data
	for lacID, amount := range revenueMap {
		response.Revenue.TotalAmount += amount
		response.Revenue.ByAccount = append(
			response.Revenue.ByAccount,
			&graph.AccountAmountSummary{
				LedgerAccount: &graph.LedgerAccount{IntID: lacID},
				TotalAmount:   amount,
				Ratio:         float64(amount) / float64(response.Revenue.TotalAmount),
			})
	}

	response.NetAmount = response.Revenue.TotalAmount - response.Expenses.TotalAmount

	return response, nil
}
