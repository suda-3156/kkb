package ledgeraccount

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/prid"
	"github.com/suda-3156/kkb/go/internal/ptrutil"
)

// TestCreate_Validation covers the input validation performed before any
// encryption or database work. Only failing inputs are exercised; a valid
// input proceeds to encryption/DB, which are nil here.
func TestCreate_Validation(t *testing.T) {
	m := New(nil, nil)
	ctx := context.Background()

	tests := []struct {
		name    string
		input   graph.CreateLedgerAccountInput
		wantErr error
	}{
		{
			name:    "empty name",
			input:   graph.CreateLedgerAccountInput{Name: "", Kind: graph.LedgerAccountKindAsset},
			wantErr: ErrNameRequired,
		},
		{
			name:    "name too long",
			input:   graph.CreateLedgerAccountInput{Name: strings.Repeat("a", 101), Kind: graph.LedgerAccountKindAsset},
			wantErr: ErrNameTooLong,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := m.Create(ctx, tt.input)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Create() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

// TestUpdate_Validation covers the parent/name validation that returns before
// any encryption or database work.
func TestUpdate_Validation(t *testing.T) {
	m := New(nil, nil)
	ctx := context.Background()

	const id = prid.ID("lac_abcdefghijklmnop")
	const other = prid.ID("lac_qrstuvwxyzabcdef")
	now := time.Now()

	tests := []struct {
		name    string
		input   graph.UpdateLedgerAccountInput
		wantErr error
	}{
		{
			name:    "self as parent",
			input:   graph.UpdateLedgerAccountInput{ID: id, ParentID: ptrutil.To(id), UpdatedAt: now},
			wantErr: ErrCannotSetSelfAsParent,
		},
		{
			name:    "set and unset parent",
			input:   graph.UpdateLedgerAccountInput{ID: id, ParentID: ptrutil.To(other), UnsetParent: true, UpdatedAt: now},
			wantErr: ErrConflictingParentOps,
		},
		{
			name:    "name too long",
			input:   graph.UpdateLedgerAccountInput{ID: id, Name: ptrutil.To(strings.Repeat("a", 101)), UpdatedAt: now},
			wantErr: ErrNameTooLong,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := m.Update(ctx, tt.input)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Update() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}
