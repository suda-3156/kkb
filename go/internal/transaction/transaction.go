package transaction

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

type TransactionManager struct {
	db *database.DB
	em *encryption.EncryptionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *TransactionManager {
	return &TransactionManager{db: db, em: em}
}
