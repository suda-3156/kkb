package secrets

import (
	"context"
	"errors"
	"testing"
)

// fakeSecretManager is an in-memory SecretManager for tests.
type fakeSecretManager struct {
	values map[string]string
	err    error
	// called records the last requested secret reference.
	called string
}

func (f *fakeSecretManager) GetSecretValue(_ context.Context, name string) (string, error) {
	f.called = name
	if f.err != nil {
		return "", f.err
	}
	v, ok := f.values[name]
	if !ok {
		return "", errors.New("not found")
	}
	return v, nil
}

func TestResolver_NilManager(t *testing.T) {
	if Resolver(nil) != nil {
		t.Error("Resolver(nil) should return nil mutator")
	}
}

func TestResolver_PassthroughNonSecret(t *testing.T) {
	fake := &fakeSecretManager{values: map[string]string{}}
	mutator := Resolver(fake)

	got, _, err := mutator(context.Background(), "", "", "plain-value", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "plain-value" {
		t.Errorf("value = %q, want plain-value", got)
	}
	if fake.called != "" {
		t.Errorf("secret manager was called for a non-secret value (ref=%q)", fake.called)
	}
}

func TestResolver_ResolvesSecret(t *testing.T) {
	fake := &fakeSecretManager{values: map[string]string{
		"projects/p/secrets/db-password/versions/latest": "s3cr3t",
	}}
	mutator := Resolver(fake)

	got, _, err := mutator(
		context.Background(), "", "",
		SecretPrefix+"projects/p/secrets/db-password/versions/latest", "",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "s3cr3t" {
		t.Errorf("resolved value = %q, want s3cr3t", got)
	}
	if fake.called != "projects/p/secrets/db-password/versions/latest" {
		t.Errorf("secret ref = %q, want the prefix stripped", fake.called)
	}
}

func TestResolver_PropagatesError(t *testing.T) {
	sentinel := errors.New("boom")
	fake := &fakeSecretManager{err: sentinel}
	mutator := Resolver(fake)

	_, _, err := mutator(context.Background(), "", "", SecretPrefix+"whatever", "")
	if err == nil {
		t.Fatal("want error when secret manager fails")
	}
	if !errors.Is(err, sentinel) {
		t.Errorf("error = %v, want wrapped %v", err, sentinel)
	}
}
