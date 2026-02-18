package ledgeraccount

import (
	ent "github.com/suda-3156/kkb/go/ent/schema"
	graph "github.com/suda-3156/kkb/go/graph/model"
)

func convertKindToEnt(kind graph.LedgerAccountKind) ent.LedgerAccountKind {
	switch kind {
	case graph.LedgerAccountKindAsset:
		return ent.Asset
	case graph.LedgerAccountKindLiability:
		return ent.Liability
	case graph.LedgerAccountKindExpense:
		return ent.Expense
	case graph.LedgerAccountKindRevenue:
		return ent.Revenue
	case graph.LedgerAccountKindEquity:
		return ent.Equity
	default:
		panic("invalid ledger account kind")
	}
}
