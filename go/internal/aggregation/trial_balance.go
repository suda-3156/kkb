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

func (m *AggregationManager) GetTrialBalance(
	ctx context.Context,
	asOf date.Date,
) (*graph.TrialBalance, error) {
	// Fetch all non-archived ledger accounts with their encryption keys.
	accounts, err := m.db.Client.LedgerAccount.Query().
		Where(ledgeraccount.ArchivedAtIsNil()).
		WithEncryptionKey().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("trial balance: fetch accounts: %w", err)
	}

	// Sum all journal entries up to asOf, grouped by (account, kind).
	var rows []lacAmountRow
	err = m.db.Client.JournalEntry.Query().
		Where(
			journalentry.HasTransactionWith(
				transaction.DateLTE(asOf),
			),
		).
		GroupBy(journalentry.LedgerAccountColumn, journalentry.FieldKind).
		Aggregate(ent.Sum(journalentry.FieldAmount)).
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("trial balance: aggregate journal entries: %w", err)
	}

	// Build a map: lacID -> {debit sum, credit sum}.
	type debitCredit struct {
		debit  int32
		credit int32
	}
	entryMap := make(map[int]*debitCredit)
	for _, row := range rows {
		if entryMap[row.LedgerAccountID] == nil {
			entryMap[row.LedgerAccountID] = &debitCredit{}
		}
		if row.Kind == ents.Debit.String() {
			entryMap[row.LedgerAccountID].debit += row.Sum
		} else {
			entryMap[row.LedgerAccountID].credit += row.Sum
		}
	}

	// Build account balance list and compute net worth.
	accountBalances := make([]*graph.AccountBalance, 0, len(accounts))
	var netWorth int32
	for _, lac := range accounts {
		graphLac, err := m.convertLedgerAccountToGraph(ctx, lac)
		if err != nil {
			return nil, fmt.Errorf("trial balance: convert ledger account: %w", err)
		}

		dc := entryMap[lac.ID]
		var balance int32
		if dc != nil {
			switch lac.Kind {
			case ents.Asset, ents.Expense:
				// Normal debit balance.
				balance = dc.debit - dc.credit
			case ents.Liability, ents.Revenue, ents.Equity:
				// Normal credit balance.
				balance = dc.credit - dc.debit
			}
		}

		accountBalances = append(accountBalances, &graph.AccountBalance{
			LedgerAccount: graphLac,
			Balance:       balance,
			AsOf:          asOf,
		})

		// Net worth = total assets - total liabilities.
		//nolint:exhaustive // We only consider Asset and Liability for net worth calculation.
		switch lac.Kind {
		case ents.Asset:
			netWorth += balance
		case ents.Liability:
			netWorth -= balance
		}
	}

	return &graph.TrialBalance{
		AsOf:     asOf,
		Accounts: accountBalances,
		NetWorth: netWorth,
	}, nil
}
