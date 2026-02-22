package ledgeraccount

import (
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
)

type LedgerAccountManager struct {
	db *database.DB
	km keys.KeyManager
}

func New(db *database.DB, km keys.KeyManager) *LedgerAccountManager {
	return &LedgerAccountManager{db: db, km: km}
}
