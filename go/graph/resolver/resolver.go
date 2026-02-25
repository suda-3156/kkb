package resolver

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	lac *ledgeraccount.LedgerAccountManager
	tnx *transaction.TransactionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *Resolver {
	return &Resolver{
		lac: ledgeraccount.New(db, em),
		tnx: transaction.New(db, em),
	}
}
