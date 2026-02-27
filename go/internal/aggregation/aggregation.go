package aggregation

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

type AggregationManager struct {
	db *database.DB
	em *encryption.EncryptionManager
}

func New(db *database.DB, em *encryption.EncryptionManager) *AggregationManager {
	return &AggregationManager{db: db, em: em}
}
