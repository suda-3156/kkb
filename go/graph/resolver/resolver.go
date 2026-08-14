package resolver

import (
	"github.com/suda-3156/kkb/go/internal/aggregation"
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/subscription"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	agg *aggregation.AggregationManager
	lac *ledgeraccount.LedgerAccountManager
	tnx *transaction.TransactionManager
	sub *subscription.SubscriptionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *Resolver {
	tnx := transaction.New(db, em)
	return &Resolver{
		agg: aggregation.New(db, em),
		lac: ledgeraccount.New(db, em),
		tnx: tnx,
		sub: subscription.New(db, em, tnx),
	}
}

// LedgerAccountManager exposes the manager the dataloader middleware batches
// through. The loaders are built per request rather than held here, so that
// they cannot outlive one request; see dataloader.Middleware.
func (r *Resolver) LedgerAccountManager() *ledgeraccount.LedgerAccountManager {
	return r.lac
}
