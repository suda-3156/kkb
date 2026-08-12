//go:build integration

package dbtest

import (
	"testing"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
)

// The fixtures below go through the real managers rather than through ent
// directly, so every row they write has been encrypted, validated and committed
// the same way a GraphQL mutation would write it.

// newAccount creates a non-group ledger account of the given kind. Names are not
// unique in the schema, so the test name is enough to tell fixtures apart when
// reading a failure.
func newAccount(t *testing.T, kind graph.LedgerAccountKind) *graph.LedgerAccount {
	t.Helper()

	lac, err := testLAC.Create(t.Context(), graph.CreateLedgerAccountInput{
		Name:    t.Name() + " " + string(kind),
		Kind:    kind,
		IsGroup: false,
	})
	if err != nil {
		t.Fatalf("create %s account: %v", kind, err)
	}

	return lac
}

// newTransaction records one balanced transaction on the given date.
func newTransaction(t *testing.T, on string, entries ...*graph.JournalEntryInput) {
	t.Helper()

	_, err := testTM.Create(t.Context(), graph.CreateTransactionInput{
		Entries:     entries,
		Date:        mustDate(t, on),
		Description: t.Name(),
	})
	if err != nil {
		t.Fatalf("create transaction on %s: %v", on, err)
	}
}

func debit(lac *graph.LedgerAccount, amount int32) *graph.JournalEntryInput {
	return &graph.JournalEntryInput{
		LedgerAccountID: lac.ID,
		Amount:          amount,
		Kind:            graph.JournalEntryKindDebit,
	}
}

func credit(lac *graph.LedgerAccount, amount int32) *graph.JournalEntryInput {
	return &graph.JournalEntryInput{
		LedgerAccountID: lac.ID,
		Amount:          amount,
		Kind:            graph.JournalEntryKindCredit,
	}
}

func mustDate(t *testing.T, s string) date.Date {
	t.Helper()

	d, err := date.NewDate(s)
	if err != nil {
		t.Fatalf("invalid fixture date %q: %v", s, err)
	}

	return *d
}

// amountOf returns the total booked to lac in the breakdown, and whether the
// account appears in it at all.
func amountOf(summaries []*graph.AccountAmountSummary, lac *graph.LedgerAccount) (int32, bool) {
	for _, s := range summaries {
		if s.LedgerAccount != nil && s.LedgerAccount.IntID == lac.IntID {
			return s.TotalAmount, true
		}
	}

	return 0, false
}
