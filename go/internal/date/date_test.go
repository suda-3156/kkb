package date

import (
	"bytes"
	"errors"
	"testing"
)

func TestNewDate(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr error
	}{
		{"valid date", "2026-07-23", nil},
		{"leap day valid", "2024-02-29", nil},
		{"empty", "", ErrInvalidDateFormat},
		{"slashes", "2026/07/23", ErrInvalidDateFormat},
		{"single digit month", "2026-7-23", ErrInvalidDateFormat},
		{"missing day", "2026-07", ErrInvalidDateFormat},
		{"trailing text", "2026-07-23 ", ErrInvalidDateFormat},
		{"month 13", "2026-13-01", ErrInvalidDate},
		{"day 32", "2026-01-32", ErrInvalidDate},
		{"non-leap Feb 29", "2026-02-29", ErrInvalidDate},
		{"April 31", "2026-04-31", ErrInvalidDate},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewDate(tt.input)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("NewDate(%q) error = %v, want %v", tt.input, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("NewDate(%q) unexpected error: %v", tt.input, err)
			}
			if got.String() != tt.input {
				t.Errorf("NewDate(%q).String() = %q", tt.input, got.String())
			}
		})
	}
}

func TestDate_MarshalGQL(t *testing.T) {
	var buf bytes.Buffer
	Date("2026-07-23").MarshalGQL(&buf)
	if got, want := buf.String(), `"2026-07-23"`; got != want {
		t.Errorf("MarshalGQL() = %s, want %s", got, want)
	}
}

func TestDate_UnmarshalGQL(t *testing.T) {
	tests := []struct {
		name    string
		v       any
		want    Date
		wantErr bool
	}{
		{"valid string", "2026-07-23", Date("2026-07-23"), false},
		{"invalid format", "2026/07/23", "", true},
		{"invalid calendar date", "2026-02-30", "", true},
		{"non-string", 42, "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var d Date
			err := d.UnmarshalGQL(tt.v)
			if tt.wantErr {
				if err == nil {
					t.Fatal("UnmarshalGQL() succeeded unexpectedly")
				}
				return
			}
			if err != nil {
				t.Fatalf("UnmarshalGQL() failed: %v", err)
			}
			if d != tt.want {
				t.Errorf("UnmarshalGQL() = %q, want %q", d, tt.want)
			}
		})
	}
}
