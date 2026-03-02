package secrets

import (
	"context"
	"fmt"

	secretmanager "cloud.google.com/go/secretmanager/apiv1"
	"cloud.google.com/go/secretmanager/apiv1/secretmanagerpb"
)

func init() {
	RegisterManager("GOOGLE_SECRET_MANAGER", NewGoogleSecretManager)
}

var _ SecretManager = (*GoogleSecretManager)(nil)

type GoogleSecretManager struct {
	client *secretmanager.Client
}

func NewGoogleSecretManager(ctx context.Context, _ *Config) (SecretManager, error) {
	client, err := secretmanager.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("secretmanager.NewClient: %w", err)
	}

	sm := &GoogleSecretManager{
		client: client,
	}

	return sm, nil
}

// GetSecretValue implements the SecretManager interface. Secret names should be
// of the format:
//
//	projects/my-project/secrets/my-secret/versions/123
func (sm *GoogleSecretManager) GetSecretValue(ctx context.Context, name string) (string, error) {
	result, err := sm.client.AccessSecretVersion(ctx, &secretmanagerpb.AccessSecretVersionRequest{
		Name: name,
	})
	if err != nil {
		return "", fmt.Errorf("failed to access secret %v: %w", name, err)
	}
	return string(result.Payload.Data), nil
}
