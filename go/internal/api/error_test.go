package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/suda-3156/kkb/go/graph"
	"github.com/suda-3156/kkb/go/internal/date"
	lac "github.com/suda-3156/kkb/go/internal/ledger_account"
	txn "github.com/suda-3156/kkb/go/internal/transaction"
)

func codeOf(t *testing.T, err error) string {
	t.Helper()
	gqlErr := ErrorPresenter(context.Background(), err)
	code, ok := gqlErr.Extensions["code"].(string)
	if !ok {
		t.Fatalf("extension code missing or not a string: %v", gqlErr.Extensions["code"])
	}
	return code
}

func TestErrorPresenter_Mapping(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantCode string
	}{
		{"invalid date format", date.ErrInvalidDateFormat, "INVALID_DATE"},
		{"invalid date", date.ErrInvalidDate, "INVALID_DATE"},
		{"invalid request", graph.ErrInvalidRequest, "INVALID_REQUEST"},
		{"account not found", lac.ErrAccountNotFound, "ACCOUNT_NOT_FOUND"},
		{"parent kind mismatch", lac.ErrParentKindMismatch, "PARENT_KIND_MISMATCH"},
		{"name required", lac.ErrNameRequired, "NAME_REQUIRED"},
		{"self as parent", lac.ErrCannotSetSelfAsParent, "CANNOT_SET_SELF_AS_PARENT"},
		{"transaction not found", txn.ErrTransactionNotFound, "TRANSACTION_NOT_FOUND"},
		{"unbalanced entries", txn.ErrUnbalancedEntries, "UNBALANCED_ENTRIES"},
		{"entries required", txn.ErrEntriesRequired, "ENTRIES_REQUIRED"},
		{"amount too large", txn.ErrAmountTooLarge, "AMOUNT_TOO_LARGE"},
		{"description too long", txn.ErrDescriptionTooLong, "DESCRIPTION_TOO_LONG"},
		{"unknown error", errors.New("something else"), "INTERNAL_SERVER_ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := codeOf(t, tt.err); got != tt.wantCode {
				t.Errorf("ErrorPresenter(%v) code = %q, want %q", tt.err, got, tt.wantCode)
			}
		})
	}
}

// TestErrorPresenter_UnwrapsWrappedErrors verifies that a domain error wrapped
// with %w (as resolvers do) is still classified via errors.Is.
func TestErrorPresenter_UnwrapsWrappedErrors(t *testing.T) {
	wrapped := fmt.Errorf("create: %w", txn.ErrUnbalancedEntries)
	if got := codeOf(t, wrapped); got != "UNBALANCED_ENTRIES" {
		t.Errorf("wrapped error code = %q, want UNBALANCED_ENTRIES", got)
	}
}
