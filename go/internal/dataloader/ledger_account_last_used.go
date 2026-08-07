package dataloader

import (
	"context"

	"github.com/graph-gophers/dataloader/v7"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

type ledgerAccountLastUsedBatcher struct {
	lac *ledgeraccount.LedgerAccountManager
}

// BatchGetLastUsed resolves the last use of every requested account in one
// query. Without this batching, the lastUsedAt / lastRecordedAt field resolvers
// would aggregate once per account in the list.
//
// A never-used account is a nil result, not an error: having no transactions is
// an ordinary state, unlike the missing account that BatchGetLedgerAccounts
// treats as a failure.
func (l *ledgerAccountLastUsedBatcher) BatchGetLastUsed(
	ctx context.Context,
	ids []int,
) []*dataloader.Result[*ledgeraccount.LastUsed] {
	results := make([]*dataloader.Result[*ledgeraccount.LastUsed], len(ids))

	lastUsed, err := l.lac.LastUsedByIDs(ctx, ids)
	if err != nil {
		for i := range results {
			results[i] = &dataloader.Result[*ledgeraccount.LastUsed]{Error: err}
		}
		return results
	}

	for i, id := range ids {
		if lu, ok := lastUsed[id]; ok {
			results[i] = &dataloader.Result[*ledgeraccount.LastUsed]{Data: &lu}
			continue
		}
		results[i] = &dataloader.Result[*ledgeraccount.LastUsed]{Data: nil}
	}

	return results
}
