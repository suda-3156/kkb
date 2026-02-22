package ledgeraccount

import (
	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
)

type LedgerAccountManager struct {
	db *database.DB
}

func New(db *database.DB) *LedgerAccountManager {
	return &LedgerAccountManager{db: db}
}
