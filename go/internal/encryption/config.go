package encryption

import (
	"time"

	"github.com/suda-3156/kkb/go/internal/infrastructure/database"
	"github.com/suda-3156/kkb/go/internal/infrastructure/keys"
)

type Config struct {
	// Dependencies
	Database   *database.DB
	KeyManager keys.KeyManager

	// Key ID of the wrapper key used for encrypting DEKs.
	WrapperKeyID string `env:"ENCRYPTION_KMS_KEY_ID"`

	// Duration for which the encryption keys are cached in memory.
	CacheTTL time.Duration `env:"ENCRYPTION_CACHE_TTL_SECONDS"`

	// AAD for ledger data encryption, not for key wrapping.
	AAD []byte `env:"ENCRYPTION_AAD"`
}
