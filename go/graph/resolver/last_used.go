package resolver

import (
	"context"

	"github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/dataloader"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

// This file is not generated. Helpers shared by the resolvers have to live
// outside *.resolvers.go, because gqlgen rewrites those files and keeps only the
// methods that correspond to schema fields - anything else is dropped on the
// next `go generate`.

// lastUsed loads the last use of one account. The lastUsedAt and lastRecordedAt
// resolvers both go through it, so asking for both costs one query for the whole
// list, not two. A never-used account yields nil, which both fields render as
// null.
func (r *ledgerAccountResolver) lastUsed(
	ctx context.Context,
	obj *model.LedgerAccount,
) (*ledgeraccount.LastUsed, error) {
	thunk := dataloader.For(ctx).LedgerAccountLastUsedLoader.Load(ctx, obj.IntID)
	return thunk()
}
