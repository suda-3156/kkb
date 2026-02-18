package ledgeraccount

import (
	"github.com/suda-3156/kkb/go/ent"
	"github.com/suda-3156/kkb/go/internal/infrastructure/kms"
)

type UseCase struct {
	kms kms.KMS
	db  *ent.Client
}

func New(kms kms.KMS, db *ent.Client) *UseCase {
	return &UseCase{
		kms: kms,
		db:  db,
	}
}
