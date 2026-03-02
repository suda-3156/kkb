package keys

import (
	"context"
	"fmt"
	"hash/crc32"

	kms "cloud.google.com/go/kms/apiv1"
	"cloud.google.com/go/kms/apiv1/kmspb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func init() {
	RegisterManager("GOOGLE_CLOUD_KMS", NewGoogleCloudKMS)
}

var (
	_ KeyManager           = (*GoogleCloudKMS)(nil)
)

type GoogleCloudKMS struct {
	client *kms.KeyManagementClient
}

func NewGoogleCloudKMS(ctx context.Context, cfg *Config) (KeyManager, error) {
	client, err := kms.NewKeyManagementClient(ctx)
	if err != nil {
		return nil, err
	}

	return &GoogleCloudKMS{
		client: client,
	}, nil
}

func (k *GoogleCloudKMS) Encrypt(ctx context.Context, keyID string, plaintext, aad []byte) ([]byte, error) {
	crc32c := func(data []byte) uint32 {
		t := crc32.MakeTable(crc32.Castagnoli)
		return crc32.Checksum(data, t)
	}
	plaintextCRC32C := crc32c(plaintext)

	req := &kmspb.EncryptRequest{
		Name:            keyID,
		Plaintext:       plaintext,
		PlaintextCrc32C: wrapperspb.Int64(int64(plaintextCRC32C)),
	}

	result, err := k.client.Encrypt(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt: %w", err)
	}

	if result.VerifiedPlaintextCrc32C == false {
		return nil, fmt.Errorf("request corrupted in-transit")
	}
	if int64(crc32c(result.Ciphertext)) != result.CiphertextCrc32C.Value {
		return nil, fmt.Errorf("response corrupted in-transit")
	}

	return result.Ciphertext, nil
}

func (k *GoogleCloudKMS) Decrypt(ctx context.Context, keyID string, ciphertext, aad []byte) ([]byte, error) {
	crc32c := func(data []byte) uint32 {
		t := crc32.MakeTable(crc32.Castagnoli)
		return crc32.Checksum(data, t)
	}
	ciphertextCRC32C := crc32c(ciphertext)

	req := &kmspb.DecryptRequest{
		Name:             keyID,
		Ciphertext:       ciphertext,
		CiphertextCrc32C: wrapperspb.Int64(int64(ciphertextCRC32C)),
	}

	result, err := k.client.Decrypt(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	if int64(crc32c(result.Plaintext)) != result.PlaintextCrc32C.Value {
		return nil, fmt.Errorf("response corrupted in-transit")
	}

	return result.Plaintext, nil
}
