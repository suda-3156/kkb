package subscription

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	graph "github.com/suda-3156/kkb/go/graph/model"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// entry is a small helper to build a template entry input.
func entry(amount int32, kind graph.JournalEntryKind) *graph.SubscriptionEntryInput {
	return &graph.SubscriptionEntryInput{
		LedgerAccountID: prid.ID("acc_abcdefghijklmnop"),
		Amount:          amount,
		Kind:            kind,
	}
}

// TestCreate_Validation covers the pure input validation performed by Create
// before any database or encryption work. Only failing inputs are exercised;
// a valid input would proceed to encryption/DB, which are nil here.
func TestCreate_Validation(t *testing.T) {
	m := New(nil, nil, nil)
	ctx := context.Background()

	debit := graph.JournalEntryKindDebit
	credit := graph.JournalEntryKindCredit

	valid := func() graph.CreateSubscriptionInput {
		return graph.CreateSubscriptionInput{
			Name:           "Netflix",
			RegisteredOn:   date.Date("2026-03-15"),
			IntervalMonths: 1,
			Entries:        []*graph.SubscriptionEntryInput{entry(100, debit), entry(100, credit)},
		}
	}

	tests := []struct {
		name    string
		mutate  func(*graph.CreateSubscriptionInput)
		wantErr error
	}{
		{
			name:    "empty name",
			mutate:  func(in *graph.CreateSubscriptionInput) { in.Name = "" },
			wantErr: ErrNameRequired,
		},
		{
			name:    "name too long",
			mutate:  func(in *graph.CreateSubscriptionInput) { in.Name = strings.Repeat("あ", 201) },
			wantErr: ErrNameTooLong,
		},
		{
			name:    "zero interval",
			mutate:  func(in *graph.CreateSubscriptionInput) { in.IntervalMonths = 0 },
			wantErr: ErrIntervalMustBePositive,
		},
		{
			name:    "negative interval",
			mutate:  func(in *graph.CreateSubscriptionInput) { in.IntervalMonths = -1 },
			wantErr: ErrIntervalMustBePositive,
		},
		{
			name:    "no entries",
			mutate:  func(in *graph.CreateSubscriptionInput) { in.Entries = nil },
			wantErr: ErrEntriesRequired,
		},
		{
			name: "single entry",
			mutate: func(in *graph.CreateSubscriptionInput) {
				in.Entries = []*graph.SubscriptionEntryInput{entry(100, debit)}
			},
			wantErr: ErrEntriesRequired,
		},
		{
			name: "zero amount",
			mutate: func(in *graph.CreateSubscriptionInput) {
				in.Entries = []*graph.SubscriptionEntryInput{entry(0, debit), entry(100, credit)}
			},
			wantErr: ErrAmountMustBePositive,
		},
		{
			name: "amount too large",
			mutate: func(in *graph.CreateSubscriptionInput) {
				in.Entries = []*graph.SubscriptionEntryInput{entry(1_000_000_000, debit), entry(1_000_000_000, credit)}
			},
			wantErr: ErrAmountTooLarge,
		},
		{
			name: "unbalanced entries",
			mutate: func(in *graph.CreateSubscriptionInput) {
				in.Entries = []*graph.SubscriptionEntryInput{entry(100, debit), entry(200, credit)}
			},
			wantErr: ErrUnbalancedEntries,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := valid()
			tt.mutate(&input)
			_, err := m.Create(ctx, input)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Create() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

// TestUpdate_Validation mirrors TestCreate_Validation for the optional fields.
func TestUpdate_Validation(t *testing.T) {
	m := New(nil, nil, nil)
	ctx := context.Background()

	debit := graph.JournalEntryKindDebit
	strPtr := func(s string) *string { return &s }
	int32Ptr := func(i int32) *int32 { return &i }

	tests := []struct {
		name    string
		input   graph.UpdateSubscriptionInput
		wantErr error
	}{
		{
			name: "empty name",
			input: graph.UpdateSubscriptionInput{
				ID:        prid.ID("sub_abcdefghijklmnop"),
				Name:      strPtr(""),
				UpdatedAt: time.Now(),
			},
			wantErr: ErrNameRequired,
		},
		{
			name: "name too long",
			input: graph.UpdateSubscriptionInput{
				ID:        prid.ID("sub_abcdefghijklmnop"),
				Name:      strPtr(strings.Repeat("a", 201)),
				UpdatedAt: time.Now(),
			},
			wantErr: ErrNameTooLong,
		},
		{
			name: "zero interval",
			input: graph.UpdateSubscriptionInput{
				ID:             prid.ID("sub_abcdefghijklmnop"),
				IntervalMonths: int32Ptr(0),
				UpdatedAt:      time.Now(),
			},
			wantErr: ErrIntervalMustBePositive,
		},
		{
			name: "single entry",
			input: graph.UpdateSubscriptionInput{
				ID:        prid.ID("sub_abcdefghijklmnop"),
				Entries:   []*graph.SubscriptionEntryInput{entry(100, debit)},
				UpdatedAt: time.Now(),
			},
			wantErr: ErrEntriesRequired,
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
