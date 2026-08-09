package dataloader

import (
	"context"
	"net/http"

	"github.com/graph-gophers/dataloader/v7"

	graph "github.com/suda-3156/kkb/go/graph/model"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

// Loaders batch the per-object lookups of one request.
//
// A set belongs to exactly one request. The loaders cache every key they have
// seen and never expire it, so a set shared between requests keeps answering
// with values from before the last mutation - which is what Middleware exists
// to prevent.
type Loaders struct {
	LedgerAccountLoader         dataloader.Interface[int, *graph.LedgerAccount]
	LedgerAccountLastUsedLoader dataloader.Interface[int, *ledgeraccount.LastUsed]
}

func New(lac *ledgeraccount.LedgerAccountManager) *Loaders {
	lacBatcher := &ledgerAccountBatcher{lac: lac}
	lastUsedBatcher := &ledgerAccountLastUsedBatcher{lac: lac}

	return &Loaders{
		LedgerAccountLoader: dataloader.NewBatchedLoader(
			lacBatcher.BatchGetLedgerAccounts,
		),
		LedgerAccountLastUsedLoader: dataloader.NewBatchedLoader(
			lastUsedBatcher.BatchGetLastUsed,
		),
	}
}

type ctxKey struct{}

// Middleware gives every request its own set of loaders.
//
// Building them once at startup instead looks harmless but is not: the loaders
// would then cache each key for the lifetime of the process, so a ledger
// account's last use would freeze at whatever it was when the server first read
// it, and no later transaction would move it.
func Middleware(lac *ledgeraccount.LedgerAccountManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), ctxKey{}, New(lac))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// For returns the loaders of the current request. It panics when the request
// did not go through Middleware, which is a wiring mistake rather than
// something a caller can recover from.
func For(ctx context.Context) *Loaders {
	loaders, ok := ctx.Value(ctxKey{}).(*Loaders)
	if !ok {
		panic("dataloader: no loaders in context - is Middleware wired up?")
	}
	return loaders
}
