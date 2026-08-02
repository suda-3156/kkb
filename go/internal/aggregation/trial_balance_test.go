package aggregation

import (
	"testing"

	ents "github.com/suda-3156/kkb/go/ent/schema"
)

func TestFoldTrialBalance(t *testing.T) {
	t.Run("net worth is assets minus liabilities", func(t *testing.T) {
		accounts := []accountKind{
			{id: 1, kind: ents.Asset},     // 銀行口座
			{id: 2, kind: ents.Asset},     // 現金
			{id: 3, kind: ents.Liability}, // クレカ
			{id: 4, kind: ents.Expense},   // 食費
			{id: 5, kind: ents.Revenue},   // 給与
			{id: 6, kind: ents.Equity},
		}
		rows := []lacAmountRow{
			row(1, ents.Debit, 250000),
			row(1, ents.Credit, 50000),
			row(2, ents.Debit, 10000),
			row(3, ents.Credit, 30000),
			row(4, ents.Debit, 20000),
			row(5, ents.Credit, 250000),
			row(6, ents.Credit, 5000),
		}

		balances, netWorth := foldTrialBalance(accounts, rows)

		want := map[int]int32{1: 200000, 2: 10000, 3: 30000, 4: 20000, 5: 250000, 6: 5000}
		for lacID, w := range want {
			if balances[lacID] != w {
				t.Errorf("balance of account %d = %d, want %d", lacID, balances[lacID], w)
			}
		}
		// 200000 + 10000 - 30000; expense, revenue and equity do not contribute.
		if netWorth != 180000 {
			t.Errorf("net worth = %d, want 180000", netWorth)
		}
	})

	t.Run("accounts without entries get a zero balance", func(t *testing.T) {
		accounts := []accountKind{{id: 1, kind: ents.Asset}, {id: 2, kind: ents.Liability}}

		balances, netWorth := foldTrialBalance(accounts, nil)

		if len(balances) != 2 {
			t.Fatalf("balances has %d entries, want one per account", len(balances))
		}
		for _, lacID := range []int{1, 2} {
			if balances[lacID] != 0 {
				t.Errorf("balance of account %d = %d, want 0", lacID, balances[lacID])
			}
		}
		if netWorth != 0 {
			t.Errorf("net worth = %d, want 0", netWorth)
		}
	})

	// Archived accounts are filtered out of the account query but not out of the
	// entry sums, so their rows must not leak into the totals.
	t.Run("ignores rows of accounts that are not listed", func(t *testing.T) {
		accounts := []accountKind{{id: 1, kind: ents.Asset}}
		rows := []lacAmountRow{
			row(1, ents.Debit, 1000),
			row(99, ents.Debit, 500000), // archived asset
		}

		balances, netWorth := foldTrialBalance(accounts, rows)

		if _, ok := balances[99]; ok {
			t.Error("balances contains the unlisted account 99")
		}
		if netWorth != 1000 {
			t.Errorf("net worth = %d, want 1000", netWorth)
		}
	})

	t.Run("a liability can go negative", func(t *testing.T) {
		accounts := []accountKind{{id: 1, kind: ents.Liability}}
		rows := []lacAmountRow{row(1, ents.Debit, 1000)} // overpaid card

		balances, netWorth := foldTrialBalance(accounts, rows)

		if balances[1] != -1000 {
			t.Errorf("balance = %d, want -1000", balances[1])
		}
		if netWorth != 1000 {
			t.Errorf("net worth = %d, want 1000 (a negative liability adds to it)", netWorth)
		}
	})
}
