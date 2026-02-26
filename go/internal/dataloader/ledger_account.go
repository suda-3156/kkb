package dataloader

import (
	"context"

	"github.com/graph-gophers/dataloader/v7"
	graph "github.com/suda-3156/kkb/go/graph/model"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

type ledgerAccountBatcher struct {
	lac *ledgeraccount.LedgerAccountManager
}

func (l *ledgerAccountBatcher) BatchGetLedgerAccounts(ctx context.Context, ids []int) []*dataloader.Result[*graph.LedgerAccount] {
	results := make([]*dataloader.Result[*graph.LedgerAccount], len(ids))
	for i := range results {
		results[i] = &dataloader.Result[*graph.LedgerAccount]{
			Error: ledgeraccount.ErrAccountNotFound,
		}
	}

	idxs := make(map[int]int, len(ids))
	for i, id := range ids {
		idxs[id] = i
	}

	accounts, err := l.lac.List(ctx, &ledgeraccount.Filter{
		IDs: ids,
	})
	if err != nil {
		for i := range results {
			results[i] = &dataloader.Result[*graph.LedgerAccount]{
				Error: err,
			}
		}
		return results
	}

	for _, acc := range accounts.Nodes {
		results[idxs[acc.IntID]] = &dataloader.Result[*graph.LedgerAccount]{
			Data: acc,
		}
	}

	return results
}
