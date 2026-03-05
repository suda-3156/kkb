package prid

import (
	"bytes"
	"database/sql/driver"
	"strings"
	"testing"
)

func TestNew(t *testing.T) {
	tests := []struct {
		name    string
		prefix  string
		wantErr bool
	}{
		{"valid 4-char prefix", "acc_", false},
		{"valid 4-char prefix txn", "txn_", false},
		{"empty prefix", "", true},
		{"prefix too short", "ac_", true},
		{"prefix too long", "accx_", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := New(tt.prefix)
			if err != nil {
				if !tt.wantErr {
					t.Errorf("New() unexpected error: %v", err)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("New() succeeded unexpectedly")
			}
			gotStr := string(got)

			if !strings.HasPrefix(gotStr, tt.prefix) {
				t.Errorf("New() = %v, does not start with prefix %q", gotStr, tt.prefix)
			}

			randomPart := gotStr[len(tt.prefix):]
			if len(randomPart) != rLen {
				t.Errorf("New() random part length = %d, want %d", len(randomPart), rLen)
			}

			if !isValidRandomPart(randomPart) {
				t.Errorf("New() random part %q contains invalid characters", randomPart)
			}
		})
	}
}

func TestNew_Uniqueness(t *testing.T) {
	id1, err1 := New("acc_")
	id2, err2 := New("acc_")
	if err1 != nil || err2 != nil {
		t.Fatalf("New() unexpected errors: %v, %v", err1, err2)
	}
	if id1 == id2 {
		t.Errorf("New() returned the same ID twice: %v", id1)
	}
}

func TestNewUnsafe(t *testing.T) {
	t.Run("valid prefix", func(t *testing.T) {
		id := NewUnsafe("acc_")
		if !strings.HasPrefix(string(id), "acc_") {
			t.Errorf("NewUnsafe() = %v, does not start with prefix %q", id, "acc_")
		}
	})

	t.Run("invalid prefix panics", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Error("NewUnsafe() with invalid prefix did not panic")
			}
		}()
		NewUnsafe("invalid_prefix")
	})
}

func TestID_UnmarshalGQL(t *testing.T) {
	const validID = "acc_abcdefghijklmnop"
	tests := []struct {
		name    string
		v       interface{}
		want    ID
		wantErr bool
	}{
		{"string value", validID, ID(validID), false},
		{"[]byte value", []byte(validID), ID(validID), false},
		{"nil value", nil, ID(""), true},
		{"int value", 42, ID(""), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var u ID
			gotErr := u.UnmarshalGQL(tt.v)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("UnmarshalGQL() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("UnmarshalGQL() succeeded unexpectedly")
			}
			if u != tt.want {
				t.Errorf("UnmarshalGQL() = %v, want %v", u, tt.want)
			}
		})
	}
}

func TestID_MarshalGQL(t *testing.T) {
	tests := []struct {
		name string
		id   ID
		want string
	}{
		{"simple ID", ID("acc_abcdefghijklmnop"), `"acc_abcdefghijklmnop"`},
		{"empty ID", ID(""), `""`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			tt.id.MarshalGQL(&buf)
			if buf.String() != tt.want {
				t.Errorf("MarshalGQL() = %v, want %v", buf.String(), tt.want)
			}
		})
	}
}

func TestID_Scan(t *testing.T) {
	const validID = "acc_abcdefghijklmnop"
	tests := []struct {
		name    string
		src     interface{}
		want    ID
		wantErr bool
	}{
		{"string value", validID, ID(validID), false},
		{"[]byte value", []byte(validID), ID(validID), false},
		{"nil value", nil, ID(""), true},
		{"int value", 42, ID(""), true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var u ID
			gotErr := u.Scan(tt.src)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Scan() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Scan() succeeded unexpectedly")
			}
			if u != tt.want {
				t.Errorf("Scan() = %v, want %v", u, tt.want)
			}
		})
	}
}

func TestID_Value(t *testing.T) {
	tests := []struct {
		name    string
		id      ID
		want    driver.Value
		wantErr bool
	}{
		{"simple ID", ID("acc_abcdefghijklmnop"), "acc_abcdefghijklmnop", false},
		{"empty ID", ID(""), "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotErr := tt.id.Value()
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("Value() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("Value() succeeded unexpectedly")
			}
			if got != tt.want {
				t.Errorf("Value() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestID_String(t *testing.T) {
	tests := []struct {
		name string
		id   ID
		want string
	}{
		{"simple ID", ID("acc_abcdefghijklmnop"), "acc_abcdefghijklmnop"},
		{"empty ID", ID(""), ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.id.String()
			if got != tt.want {
				t.Errorf("String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestID_IsValid(t *testing.T) {
	tests := []struct {
		name    string
		id      ID
		prefix  string
		wantErr bool
	}{
		{"valid ID", ID("acc_abcdefghijklmnop"), "acc_", false},
		{"invalid empty prefix", ID("abcdefghijklmnop"), "", true},
		{"invalid prefix length", ID("acc_abcdefghijklmnop"), "acc", true},
		{"wrong prefix", ID("txn_abcdefghijklmnop"), "acc_", true},
		{"only prefix no random part", ID("acc_"), "acc_", true},
		{"random part too short", ID("acc_abc"), "acc_", true},
		{"random part too long", ID("acc_abcdefghijklmnopqrstu"), "acc_", true},
		{"invalid chars in random part", ID("acc_!!!invalid!!!!!"), "acc_", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotErr := tt.id.IsValid(tt.prefix)
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("IsValid() failed: %v", gotErr)
				}
				return
			}
			if tt.wantErr {
				t.Fatal("IsValid() succeeded unexpectedly")
			}
		})
	}
}

func TestNew_IsValid(t *testing.T) {
	prefixes := []string{"acc_", "txn_", "usr_"}
	for _, prefix := range prefixes {
		id, err := New(prefix)
		if err != nil {
			t.Errorf("New(%q) unexpected error: %v", prefix, err)
			continue
		}
		if err := id.IsValid(prefix); err != nil {
			t.Errorf("New(%q).IsValid(%q) = %v, want nil", prefix, prefix, err)
		}
	}
}
