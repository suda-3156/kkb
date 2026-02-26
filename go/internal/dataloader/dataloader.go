package dataloader

import (
	"github.com/graph-gophers/dataloader/v7"

	graph "github.com/suda-3156/kkb/go/graph/model"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

type Loaders struct {
	LedgerAccountLoader dataloader.Interface[int, *graph.LedgerAccount]
}

func New(lac *ledgeraccount.LedgerAccountManager) *Loaders {
	lacBatcher := &ledgerAccountBatcher{lac: lac}

	return &Loaders{
		LedgerAccountLoader: dataloader.NewBatchedLoader(
			lacBatcher.BatchGetLedgerAccounts,
		),
	}
}
