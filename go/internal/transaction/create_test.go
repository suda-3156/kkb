package transaction

import (
	"context"
	"errors"
	"strings"
	"testing"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// entry is a small helper to build a journal entry input.
func entry(amount int32, kind graph.JournalEntryKind) *graph.JournalEntryInput {
	return &graph.JournalEntryInput{
		LedgerAccountID: prid.ID("acc_abcdefghijklmnop"),
		Amount:          amount,
		Kind:            kind,
	}
}

// TestCreate_Validation covers the pure input validation performed by Create
// before any database or encryption work. Only failing inputs are exercised;
// a valid input would proceed to encryption/DB, which are nil here.
func TestCreate_Validation(t *testing.T) {
	m := New(nil, nil)
	ctx := context.Background()

	debit := graph.JournalEntryKindDebit
	credit := graph.JournalEntryKindCredit

	tests := []struct {
		name    string
		input   graph.CreateTransactionInput
		wantErr error
	}{
		{
			name: "no entries",
			input: graph.CreateTransactionInput{
				Entries:     nil,
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrEntriesRequired,
		},
		{
			name: "single entry",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(100, debit)},
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrEntriesRequired,
		},
		{
			name: "empty description",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(100, debit), entry(100, credit)},
				Date:        date.Date("2026-07-23"),
				Description: "",
			},
			wantErr: ErrDescriptionRequired,
		},
		{
			name: "description too long",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(100, debit), entry(100, credit)},
				Date:        date.Date("2026-07-23"),
				Description: strings.Repeat("あ", 301),
			},
			wantErr: ErrDescriptionTooLong,
		},
		{
			name: "zero amount",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(0, debit), entry(100, credit)},
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrAmountMustBePositive,
		},
		{
			name: "negative amount",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(-100, debit), entry(100, credit)},
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrAmountMustBePositive,
		},
		{
			name: "amount too large",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(1_000_000_000, debit), entry(1_000_000_000, credit)},
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrAmountTooLarge,
		},
		{
			name: "unbalanced entries",
			input: graph.CreateTransactionInput{
				Entries:     []*graph.JournalEntryInput{entry(100, debit), entry(200, credit)},
				Date:        date.Date("2026-07-23"),
				Description: "lunch",
			},
			wantErr: ErrUnbalancedEntries,
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
