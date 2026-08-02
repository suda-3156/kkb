package aggregation

import (
	ents "github.com/suda-3156/kkb/go/ent/schema"
)

// This file holds the pure arithmetic shared by every aggregation query:
// which side of an account increases its balance, and how amounts are
// apportioned. Keeping it out of the query methods makes it testable without
// a database.

// accountKind is the minimal ledger account information the arithmetic needs.
type accountKind struct {
	id   int
	kind ents.LedgerAccountKind
}

// debitCredit accumulates the debit and credit sums of one ledger account.
type debitCredit struct {
	debit  int32
	credit int32
}

// foldDebitCredit groups rows, which arrive as one row per (account, kind),
// into per-account debit / credit sums.
func foldDebitCredit(rows []lacAmountRow) map[int]debitCredit {
	out := make(map[int]debitCredit, len(rows))
	for _, row := range rows {
		dc := out[row.LedgerAccountID]
		if row.Kind == ents.Debit.String() {
			dc.debit += row.Sum
		} else {
			dc.credit += row.Sum
		}
		out[row.LedgerAccountID] = dc
	}
	return out
}

// balanceOf applies the normal balance side of the account kind: assets and
// expenses increase on the debit side, liabilities, revenue and equity on the
// credit side.
func balanceOf(kind ents.LedgerAccountKind, dc debitCredit) int32 {
	switch kind {
	case ents.Asset, ents.Expense:
		return dc.debit - dc.credit
	case ents.Liability, ents.Revenue, ents.Equity:
		return dc.credit - dc.debit
	}
	return 0
}

// signedAmount is balanceOf for a single row: the sum is returned as-is when it
// sits on the account's normal side, and negated when it sits on the other one.
func signedAmount(kind ents.LedgerAccountKind, entryKind string, sum int32) int32 {
	dc := debitCredit{}
	if entryKind == ents.Debit.String() {
		dc.debit = sum
	} else {
		dc.credit = sum
	}
	return balanceOf(kind, dc)
}

// ratio apportions amount against total. A zero total yields 0 rather than
// NaN / ±Inf, which cannot be represented in the GraphQL Float output.
func ratio(amount, total int32) float64 {
	if total == 0 {
		return 0
	}
	return float64(amount) / float64(total)
}
