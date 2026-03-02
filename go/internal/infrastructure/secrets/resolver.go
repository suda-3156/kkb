package secrets

import (
	"context"
	"fmt"
	"strings"

	"github.com/sethvargo/go-envconfig"
)

const (
	// SecretPrefix is the prefix used to identify secret references in environment variables.
	SecretPrefix = "secret://"
)

// Resolver returns an envconfig.MutatorFunc that resolves secrets
// in environment variables using the provided secret manager and configuration.
func Resolver(sm SecretManager, config *Config) envconfig.MutatorFunc {
	if sm == nil {
		return nil
	}

	return func(
		ctx context.Context, originalKey, resolvedKey, originalValue, currentValue string,
	) (string, bool, error) {
		// The second return value (bool) indicates whether future mutations in the stack
		// should be applied. We want to continue applying future mutations,
		// so we return false here.

		if !strings.HasPrefix(originalValue, SecretPrefix) {
			return originalValue, false, nil
		}

		secretRef := strings.TrimPrefix(originalValue, SecretPrefix)

		secretVal, err := sm.GetSecretValue(ctx, secretRef)
		if err != nil {
			return "", false, fmt.Errorf("failed to resolve secret %q: %w", secretRef, err)
		}

		return secretVal, false, nil
	}
}
