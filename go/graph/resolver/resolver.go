package resolver

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	ledgeraccount "github.com/suda-3156/kkb/go/internal/ledger_account"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

type Resolver struct {
	lac *ledgeraccount.LedgerAccountManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *Resolver {
	return &Resolver{
		lac: ledgeraccount.New(db, em),
	}
}
