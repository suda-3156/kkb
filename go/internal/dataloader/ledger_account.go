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

func (l *ledgerAccountBatcher) BatchGetLedgerAccounts(ctx context.Context, IDs []int) []*dataloader.Result[*graph.LedgerAccount] {
	results := make([]*dataloader.Result[*graph.LedgerAccount], len(IDs))
	for i := range results {
		results[i] = &dataloader.Result[*graph.LedgerAccount]{
			Error: ledgeraccount.ErrAccountNotFound,
		}
	}

	idxs := make(map[int]int, len(IDs))
	for i, id := range IDs {
		idxs[id] = i
	}

	accounts, err := l.lac.List(ctx, &ledgeraccount.Filter{
		IDs: IDs,
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
			Data: &graph.LedgerAccount{
				ID:   acc.ID,
				Name: acc.Name,
			},
		}
	}

	return results
}
