package ledgeraccount

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

type LedgerAccountManager struct {
	db *database.DB
	em *encryption.EncryptionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *LedgerAccountManager {
	return &LedgerAccountManager{db: db, em: em}
}
