package transaction

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

// TestUpdate_Validation covers the pure input validation performed by Update
// before any database or encryption work. Entries are validated only when
// provided; description length is validated only when a description is given.
func TestUpdate_Validation(t *testing.T) {
	m := New(nil, nil)
	ctx := context.Background()

	debit := graph.JournalEntryKindDebit
	credit := graph.JournalEntryKindCredit
	const id = prid.ID("txn_abcdefghijklmnop")
	now := time.Now()

	tests := []struct {
		name    string
		input   graph.UpdateTransactionInput
		wantErr error
	}{
		{
			name: "single entry",
			input: graph.UpdateTransactionInput{
				ID:        id,
				Entries:   []*graph.JournalEntryInput{entry(100, debit)},
				UpdatedAt: now,
			},
			wantErr: ErrEntriesRequired,
		},
		{
			name: "zero amount",
			input: graph.UpdateTransactionInput{
				ID:        id,
				Entries:   []*graph.JournalEntryInput{entry(0, debit), entry(100, credit)},
				UpdatedAt: now,
			},
			wantErr: ErrAmountMustBePositive,
		},
		{
			name: "amount too large",
			input: graph.UpdateTransactionInput{
				ID:        id,
				Entries:   []*graph.JournalEntryInput{entry(1_000_000_000, debit), entry(1_000_000_000, credit)},
				UpdatedAt: now,
			},
			wantErr: ErrAmountTooLarge,
		},
		{
			name: "unbalanced entries",
			input: graph.UpdateTransactionInput{
				ID:        id,
				Entries:   []*graph.JournalEntryInput{entry(100, debit), entry(200, credit)},
				UpdatedAt: now,
			},
			wantErr: ErrUnbalancedEntries,
		},
		{
			name: "description too long",
			input: graph.UpdateTransactionInput{
				ID:          id,
				Description: ptrutil.To(strings.Repeat("あ", 301)),
				UpdatedAt:   now,
			},
			wantErr: ErrDescriptionTooLong,
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
