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

func convertKindToGraph(kind ent.LedgerAccountKind) graph.LedgerAccountKind {
	switch kind {
	case ent.Asset:
		return graph.LedgerAccountKindAsset
	case ent.Liability:
		return graph.LedgerAccountKindLiability
	case ent.Expense:
		return graph.LedgerAccountKindExpense
	case ent.Revenue:
		return graph.LedgerAccountKindRevenue
	case ent.Equity:
		return graph.LedgerAccountKindEquity
	default:
		panic("invalid ledger account kind")
	}
}
