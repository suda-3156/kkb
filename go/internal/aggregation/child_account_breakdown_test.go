package aggregation

import (
	"testing"

	ents "github.com/suda-3156/kkb/go/ent/schema"
)

func TestFoldChildBreakdown(t *testing.T) {
	t.Run("signs each child by its own kind", func(t *testing.T) {
		children := []accountKind{
			{id: 1, kind: ents.Expense},
			{id: 2, kind: ents.Expense},
			{id: 3, kind: ents.Expense},
		}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(2, ents.Debit, 1000),
			row(3, ents.Debit, 1500),
			row(3, ents.Credit, 500), // refund on the third child
		}

		amounts, total := foldChildBreakdown(children, rows)

		want := map[int]int32{1: 3000, 2: 1000, 3: 1000}
		for lacID, w := range want {
			if amounts[lacID] != w {
				t.Errorf("amount of child %d = %d, want %d", lacID, amounts[lacID], w)
			}
		}
		if total != 5000 {
			t.Errorf("total = %d, want 5000", total)
		}
	})

	t.Run("credit-normal children", func(t *testing.T) {
		children := []accountKind{
			{id: 1, kind: ents.Revenue},
			{id: 2, kind: ents.Liability},
		}
		rows := []lacAmountRow{
			row(1, ents.Credit, 250000),
			row(1, ents.Debit, 50000),
			row(2, ents.Credit, 30000),
		}

		amounts, total := foldChildBreakdown(children, rows)

		if amounts[1] != 200000 {
			t.Errorf("amount of child 1 = %d, want 200000", amounts[1])
		}
		if amounts[2] != 30000 {
			t.Errorf("amount of child 2 = %d, want 30000", amounts[2])
		}
		if total != 230000 {
			t.Errorf("total = %d, want 230000", total)
		}
	})

	t.Run("ignores rows of accounts that are not children", func(t *testing.T) {
		children := []accountKind{{id: 1, kind: ents.Expense}}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(99, ents.Debit, 999999),
		}

		amounts, total := foldChildBreakdown(children, rows)

		if _, ok := amounts[99]; ok {
			t.Error("amounts contains the non-child account 99")
		}
		if total != 3000 {
			t.Errorf("total = %d, want 3000", total)
		}
	})

	t.Run("children without entries are absent from the map", func(t *testing.T) {
		children := []accountKind{{id: 1, kind: ents.Expense}, {id: 2, kind: ents.Expense}}
		rows := []lacAmountRow{row(1, ents.Debit, 3000)}

		amounts, total := foldChildBreakdown(children, rows)

		// The caller reads the map per child, so a missing key must read as 0.
		if amounts[2] != 0 {
			t.Errorf("amount of child 2 = %d, want 0", amounts[2])
		}
		if total != 3000 {
			t.Errorf("total = %d, want 3000", total)
		}
		// And a zero total must not divide by zero downstream.
		if got := ratio(amounts[2], total); got != 0 {
			t.Errorf("ratio = %v, want 0", got)
		}
	})

	t.Run("offsetting children give a zero total", func(t *testing.T) {
		children := []accountKind{{id: 1, kind: ents.Expense}, {id: 2, kind: ents.Expense}}
		rows := []lacAmountRow{
			row(1, ents.Debit, 3000),
			row(2, ents.Credit, 3000),
		}

		amounts, total := foldChildBreakdown(children, rows)

		if total != 0 {
			t.Fatalf("total = %d, want 0", total)
		}
		if got := ratio(amounts[1], total); got != 0 {
			t.Errorf("ratio = %v, want 0 for a zero total", got)
		}
	})
}
