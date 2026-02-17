package ledgeraccount

import (
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/infrastructure/kms"
)

type LedgerAccountUseCase struct {
	kms kms.KMS
	db  *ent.Client
}

func New(kms kms.KMS, db *ent.Client) *LedgerAccountUseCase {
	return &LedgerAccountUseCase{
		kms: kms,
		db:  db,
	}
}
