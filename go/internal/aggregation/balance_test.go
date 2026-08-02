package aggregation

import (
	"math"
	"testing"

	ents "github.com/suda-3156/kkb/go/ent/schema"
)

// row builds an aggregated row as it comes back from the GROUP BY query.
func row(lacID int, kind ents.JournalEntryKind, sum int32) lacAmountRow {
	return lacAmountRow{LedgerAccountID: lacID, Kind: kind.String(), Sum: sum}
}

func TestBalanceOf(t *testing.T) {
	tests := []struct {
		name string
		kind ents.LedgerAccountKind
		dc   debitCredit
		want int32
	}{
		{"asset increases on debit", ents.Asset, debitCredit{debit: 1000, credit: 300}, 700},
		{"expense increases on debit", ents.Expense, debitCredit{debit: 1000, credit: 300}, 700},
		{"liability increases on credit", ents.Liability, debitCredit{debit: 300, credit: 1000}, 700},
		{"revenue increases on credit", ents.Revenue, debitCredit{debit: 300, credit: 1000}, 700},
		{"equity increases on credit", ents.Equity, debitCredit{debit: 300, credit: 1000}, 700},
		{"asset can go negative", ents.Asset, debitCredit{debit: 100, credit: 500}, -400},
		{"no entries", ents.Asset, debitCredit{}, 0},
		{"unknown kind", ents.LedgerAccountKind("UNKNOWN"), debitCredit{debit: 1000}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := balanceOf(tt.kind, tt.dc); got != tt.want {
				t.Errorf("balanceOf(%q, %+v) = %d, want %d", tt.kind, tt.dc, got, tt.want)
			}
		})
	}
}

func TestSignedAmount(t *testing.T) {
	tests := []struct {
		name      string
		kind      ents.LedgerAccountKind
		entryKind ents.JournalEntryKind
		sum       int32
		want      int32
	}{
		{"expense on debit is positive", ents.Expense, ents.Debit, 1200, 1200},
		{"expense on credit is a refund", ents.Expense, ents.Credit, 1200, -1200},
		{"revenue on credit is positive", ents.Revenue, ents.Credit, 250000, 250000},
		{"revenue on debit is a reversal", ents.Revenue, ents.Debit, 250000, -250000},
		{"asset on debit is positive", ents.Asset, ents.Debit, 500, 500},
		{"asset on credit is negative", ents.Asset, ents.Credit, 500, -500},
		{"liability on credit is positive", ents.Liability, ents.Credit, 800, 800},
		{"equity on debit is negative", ents.Equity, ents.Debit, 800, -800},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := signedAmount(tt.kind, tt.entryKind.String(), tt.sum)
			if got != tt.want {
				t.Errorf("signedAmount(%q, %q, %d) = %d, want %d",
					tt.kind, tt.entryKind, tt.sum, got, tt.want)
			}
		})
	}
}

func TestFoldDebitCredit(t *testing.T) {
	t.Run("groups per account", func(t *testing.T) {
		got := foldDebitCredit([]lacAmountRow{
			row(1, ents.Debit, 1000),
			row(1, ents.Credit, 300),
			row(2, ents.Credit, 500),
		})

		want := map[int]debitCredit{
			1: {debit: 1000, credit: 300},
			2: {credit: 500},
		}
		if len(got) != len(want) {
			t.Fatalf("foldDebitCredit() has %d accounts, want %d", len(got), len(want))
		}
		for lacID, w := range want {
			if got[lacID] != w {
				t.Errorf("account %d = %+v, want %+v", lacID, got[lacID], w)
			}
		}
	})

	t.Run("accumulates repeated rows of the same side", func(t *testing.T) {
		got := foldDebitCredit([]lacAmountRow{
			row(1, ents.Debit, 100),
			row(1, ents.Debit, 250),
		})
		if want := (debitCredit{debit: 350}); got[1] != want {
			t.Errorf("account 1 = %+v, want %+v", got[1], want)
		}
	})

	t.Run("no rows", func(t *testing.T) {
		if got := foldDebitCredit(nil); len(got) != 0 {
			t.Errorf("foldDebitCredit(nil) = %v, want empty", got)
		}
	})
}

func TestRatio(t *testing.T) {
	tests := []struct {
		name   string
		amount int32
		total  int32
		want   float64
	}{
		{"quarter", 25, 100, 0.25},
		{"whole", 100, 100, 1},
		{"negative amount", -25, 100, -0.25},
		// Regression: a period whose entries cancel out has a zero total. Dividing
		// by it produced NaN / ±Inf, which cannot be marshaled into the response.
		{"zero total", 100, 0, 0},
		{"zero over zero", 0, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ratio(tt.amount, tt.total)
			if math.IsNaN(got) || math.IsInf(got, 0) {
				t.Fatalf("ratio(%d, %d) = %v, must be a finite number", tt.amount, tt.total, got)
			}
			if got != tt.want {
				t.Errorf("ratio(%d, %d) = %v, want %v", tt.amount, tt.total, got, tt.want)
			}
		})
	}
}
