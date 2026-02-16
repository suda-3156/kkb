package kms

import (
	"context"
	"testing"
)

func Test_kms_Encrypt(t *testing.T) {
	tests := []struct {
		name string // description of this test case
		// Named input parameters for target function.
		plaintext string
		want      []byte
		wantErr   bool
	}{
		{
			name:      "Encrypts plaintext successfully",
			plaintext: "Hello, World!",
			wantErr:   false,
		},
		{
			name:      "Encrypts empty plaintext",
			plaintext: "",
			wantErr:   true,
		},
		{
			name:      "Encrypts long plaintext",
			plaintext: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Culpa vero nulla reiciendis aspernatur et quaerat enim excepturi dolores soluta? Nam dignissimos exercitationem dolor nemo quaerat omnis. Sequi debitis consectetur ad dolore itaque alias iure amet nobis quam labore iste dignissimos fuga iusto sunt enim, sed at voluptates repellendus veritatis quidem aperiam ipsa voluptas! Nam debitis quo error magni ipsam dolorem velit temporibus aperiam cum facilis. Aliquam ullam odio nobis, consequatur dolorum maxime molestias dicta officia tempora alias suscipit ea voluptatem, harum sunt nesciunt similique molestiae eum magnam ipsam quo facilis soluta eveniet repellendus! Sapiente, veritatis non optio expedita saepe odit!",
			wantErr:   false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var k kms

			k.dek = []byte("0123456789abcdef0123456789abcdef") // 32-byte DEK for testing

			got, gotErr := k.Encrypt(context.Background(), tt.plaintext)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Encrypt() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Encrypt() succeeded unexpectedly")
			}

			if len(got) == 0 {
				t.Errorf("Encrypt() = %v, want non-empty ciphertext", got)
			}

			t.Logf("Byte length of ciphertext: %d", len(got))
		})
	}
}
