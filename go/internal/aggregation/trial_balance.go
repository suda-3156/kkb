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

	kinds := make([]accountKind, 0, len(accounts))
	for _, lac := range accounts {
		kinds = append(kinds, accountKind{id: lac.ID, kind: lac.Kind})
	}
	balances, netWorth := foldTrialBalance(kinds, rows)

	accountBalances := make([]*graph.AccountBalance, 0, len(accounts))
	for _, lac := range accounts {
		graphLac, err := m.convertLedgerAccountToGraph(ctx, lac)
		if err != nil {
			return nil, fmt.Errorf("trial balance: convert ledger account: %w", err)
		}

		accountBalances = append(accountBalances, &graph.AccountBalance{
			LedgerAccount: graphLac,
			Balance:       balances[lac.ID],
			AsOf:          asOf,
		})
	}

	return &graph.TrialBalance{
		AsOf:     asOf,
		Accounts: accountBalances,
		NetWorth: netWorth,
	}, nil
}

// foldTrialBalance computes the balance of every given account and the net
// worth over them. Accounts without entries get a zero balance, and rows
// belonging to an account that is not listed (an archived one) are ignored.
//
// Net worth is total assets minus total liabilities; revenue, expense and
// equity accounts do not contribute.
func foldTrialBalance(
	accounts []accountKind,
	rows []lacAmountRow,
) (balances map[int]int32, netWorth int32) {
	entries := foldDebitCredit(rows)

	balances = make(map[int]int32, len(accounts))
	for _, account := range accounts {
		balance := balanceOf(account.kind, entries[account.id])
		balances[account.id] = balance

		//nolint:exhaustive // Only assets and liabilities make up net worth.
		switch account.kind {
		case ents.Asset:
			netWorth += balance
		case ents.Liability:
			netWorth -= balance
		}
	}

	return balances, netWorth
}
