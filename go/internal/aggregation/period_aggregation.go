package aggregation

import (
	"context"
	"fmt"
	"strconv"

	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/ent/schema"
	"github.com/suda-3156/kkb/go/ent/transaction"
	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/logging"
)

// accountAgg holds raw aggregation data keyed by ent.LedgerAccount internal ID.
type accountAgg struct {
	entAccount  *ent.LedgerAccount
	totalAmount int64
}

// PeriodAggregation returns expenses, revenue, and net amount for the given date range.
func (m *AggregationManager) PeriodAggregation(
	ctx context.Context,
	startDate date.Date,
	endDate date.Date,
) (*graph.PeriodAggregation, error) {
	logging.Debug(ctx, "aggregation - period aggregation called")

	txns, err := m.db.Client.Transaction.Query().
		Where(
			transaction.DateGTE(startDate),
			transaction.DateLTE(endDate),
		).
		WithEncryptionKey().
		WithEntries(func(q *ent.JournalEntryQuery) {
			q.WithLedgerAccount(func(lq *ent.LedgerAccountQuery) {
				lq.WithEncryptionKey()
			})
		}).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("period aggregation: query: %w", err)
	}

	expenseByAccount := map[int]*accountAgg{}
	revenueByAccount := map[int]*accountAgg{}

	for _, txn := range txns {
		if txn.Edges.EncryptionKey == nil {
			return nil, fmt.Errorf("period aggregation: encryption key not loaded for transaction %v", txn.PublicID)
		}
		keyID := txn.Edges.EncryptionKey.ID

		for _, entry := range txn.Edges.Entries {
			if entry.Edges.LedgerAccount == nil {
				continue
			}
			lac := entry.Edges.LedgerAccount

			amountStr, err := m.em.Decrypt(ctx, entry.Amount, keyID)
			if err != nil {
				return nil, fmt.Errorf("period aggregation: decrypt amount: %w", err)
			}
			amount, err := strconv.ParseInt(amountStr, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("period aggregation: parse amount: %w", err)
			}

			switch lac.Kind {
			case schema.Expense:
				if agg, ok := expenseByAccount[lac.ID]; ok {
					agg.totalAmount += amount
				} else {
					expenseByAccount[lac.ID] = &accountAgg{entAccount: lac, totalAmount: amount}
				}
			case schema.Revenue:
				if agg, ok := revenueByAccount[lac.ID]; ok {
					agg.totalAmount += amount
				} else {
					revenueByAccount[lac.ID] = &accountAgg{entAccount: lac, totalAmount: amount}
				}
			}
		}
	}

	expenses, err := m.buildExpenseSummary(ctx, expenseByAccount)
	if err != nil {
		return nil, err
	}
	revenue, err := m.buildRevenueSummary(ctx, revenueByAccount)
	if err != nil {
		return nil, err
	}

	netAmount := int32(revenue.TotalAmount - expenses.TotalAmount) //nolint:gosec

	return &graph.PeriodAggregation{
		StartDate: startDate,
		EndDate:   endDate,
		Expenses:  expenses,
		Revenue:   revenue,
		NetAmount: netAmount,
	}, nil
}

func (m *AggregationManager) buildExpenseSummary(
	ctx context.Context,
	byAccount map[int]*accountAgg,
) (*graph.ExpenseSummary, error) {
	items, total, err := m.buildAccountAmountSummaries(ctx, byAccount)
	if err != nil {
		return nil, err
	}
	return &graph.ExpenseSummary{
		TotalAmount: int32(total), //nolint:gosec
		ByAccount:   items,
	}, nil
}

func (m *AggregationManager) buildRevenueSummary(
	ctx context.Context,
	byAccount map[int]*accountAgg,
) (*graph.RevenueSummary, error) {
	items, total, err := m.buildAccountAmountSummaries(ctx, byAccount)
	if err != nil {
		return nil, err
	}
	return &graph.RevenueSummary{
		TotalAmount: int32(total), //nolint:gosec
		ByAccount:   items,
	}, nil
}

// buildAccountAmountSummaries converts a map of accountAgg into graph summaries with ratios.
// It also returns the total amount across all accounts.
func (m *AggregationManager) buildAccountAmountSummaries(
	ctx context.Context,
	byAccount map[int]*accountAgg,
) ([]*graph.AccountAmountSummary, int64, error) {
	var total int64
	for _, agg := range byAccount {
		total += agg.totalAmount
	}

	summaries := make([]*graph.AccountAmountSummary, 0, len(byAccount))
	for _, agg := range byAccount {
		lac, err := m.convertLedgerAccountToGraph(ctx, agg.entAccount)
		if err != nil {
			return nil, 0, fmt.Errorf("buildAccountAmountSummaries: %w", err)
		}

		var ratio float64
		if total > 0 {
			ratio = float64(agg.totalAmount) / float64(total)
		}

		summaries = append(summaries, &graph.AccountAmountSummary{
			LedgerAccount: lac,
			TotalAmount:   int32(agg.totalAmount), //nolint:gosec
			Ratio:         ratio,
		})
	}

	return summaries, total, nil
}
