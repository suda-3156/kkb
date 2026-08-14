package subscription

import (
	"github.com/suda-3156/kkb/go/internal/encryption"
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/transaction"
)

type SubscriptionManager struct {
	db *database.DB
	em *encryption.EncryptionManager
	// Occurrence history and the calendar return full transactions, which only
	// the transaction manager knows how to decrypt and convert.
	tm *transaction.TransactionManager
}

func New(
	db *database.DB,
	em *encryption.EncryptionManager,
	tm *transaction.TransactionManager,
) *SubscriptionManager {
	return &SubscriptionManager{db: db, em: em, tm: tm}
}
