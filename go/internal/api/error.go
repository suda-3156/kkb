package api

import (
	"context"
	"errors"
	"log/slog"

	"github.com/suda-3156/kkb/go/graph"
	lac "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	txn "github.com/suda-3156/kkb/go/internal/transaction"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

func ErrorPresenter(ctx context.Context, err error) *gqlerror.Error {
	logging.Error(ctx, "error in GraphQL resolver", slog.Any("error", err))

	switch {
	// graphql layer
	case errors.Is(err, graph.ErrInvalidRequest):
		return &gqlerror.Error{
			Message: "Invalid request",
			Extensions: map[string]interface{}{
				"code": "INVALID_REQUEST",
			},
		}

	// Ledger account lifecycle
	case errors.Is(err, lac.ErrAccountNotFound):
		return &gqlerror.Error{
			Message: "Ledger account not found",
			Extensions: map[string]interface{}{
				"code": "ACCOUNT_NOT_FOUND",
			},
		}
	case errors.Is(err, lac.ErrAccountAlreadyArchived):
		return &gqlerror.Error{
			Message: "Ledger account is already archived",
			Extensions: map[string]interface{}{
				"code": "ACCOUNT_ALREADY_ARCHIVED",
			},
		}
	case errors.Is(err, lac.ErrAccountModified):
		return &gqlerror.Error{
			Message: "Ledger account has been modified by another process",
			Extensions: map[string]interface{}{
				"code": "ACCOUNT_MODIFIED",
			},
		}

	// Parent constraints
	case errors.Is(err, lac.ErrParentNotFound):
		return &gqlerror.Error{
			Message: "Parent ledger account not found",
			Extensions: map[string]interface{}{
				"code": "PARENT_NOT_FOUND",
			},
		}
	case errors.Is(err, lac.ErrParentArchived):
		return &gqlerror.Error{
			Message: "Cannot use an archived account as parent",
			Extensions: map[string]interface{}{
				"code": "PARENT_ARCHIVED",
			},
		}
	case errors.Is(err, lac.ErrParentNotGroup):
		return &gqlerror.Error{
			Message: "Parent ledger account must be a group",
			Extensions: map[string]interface{}{
				"code": "PARENT_NOT_GROUP",
			},
		}
	case errors.Is(err, lac.ErrParentKindMismatch):
		return &gqlerror.Error{
			Message: "Parent ledger account kind must match the new account kind",
			Extensions: map[string]interface{}{
				"code": "PARENT_KIND_MISMATCH",
			},
		}
	case errors.Is(err, lac.ErrParentIsArchivedOnUnarchive):
		return &gqlerror.Error{
			Message: "Cannot unarchive an account whose parent is archived",
			Extensions: map[string]interface{}{
				"code": "PARENT_IS_ARCHIVED",
			},
		}

	// Name validation
	case errors.Is(err, lac.ErrNameRequired):
		return &gqlerror.Error{
			Message: "Name is required",
			Extensions: map[string]interface{}{
				"code": "NAME_REQUIRED",
			},
		}
	case errors.Is(err, lac.ErrNameTooLong):
		return &gqlerror.Error{
			Message: "Name must be at most 100 characters",
			Extensions: map[string]interface{}{
				"code": "NAME_TOO_LONG",
			},
		}

	// Structural constraints
	case errors.Is(err, lac.ErrCannotSetSelfAsParent):
		return &gqlerror.Error{
			Message: "Cannot set itself as parent",
			Extensions: map[string]interface{}{
				"code": "CANNOT_SET_SELF_AS_PARENT",
			},
		}
	case errors.Is(err, lac.ErrConflictingParentOps):
		return &gqlerror.Error{
			Message: "Cannot set and unset parent at the same time",
			Extensions: map[string]interface{}{
				"code": "CONFLICTING_PARENT_OPS",
			},
		}
	case errors.Is(err, lac.ErrCannotChangeToNonGroupWithChildren):
		return &gqlerror.Error{
			Message: "Cannot change to non-group account while it has child accounts",
			Extensions: map[string]interface{}{
				"code": "CANNOT_CHANGE_TO_NON_GROUP_WITH_CHILDREN",
			},
		}

	// Transaction lifecycle
	case errors.Is(err, txn.ErrTransactionNotFound):
		return &gqlerror.Error{
			Message: "Transaction not found",
			Extensions: map[string]interface{}{
				"code": "TRANSACTION_NOT_FOUND",
			},
		}
	case errors.Is(err, txn.ErrTransactionModified):
		return &gqlerror.Error{
			Message: "Transaction has been modified by another process",
			Extensions: map[string]interface{}{
				"code": "TRANSACTION_MODIFIED",
			},
		}

	// Journal entries validation
	case errors.Is(err, txn.ErrEntriesRequired):
		return &gqlerror.Error{
			Message: "At least 2 journal entries are required",
			Extensions: map[string]interface{}{
				"code": "ENTRIES_REQUIRED",
			},
		}
	case errors.Is(err, txn.ErrUnbalancedEntries):
		return &gqlerror.Error{
			Message: "Total debits must equal total credits",
			Extensions: map[string]interface{}{
				"code": "UNBALANCED_ENTRIES",
			},
		}
	case errors.Is(err, txn.ErrAmountMustBePositive):
		return &gqlerror.Error{
			Message: "Amount must be positive",
			Extensions: map[string]interface{}{
				"code": "AMOUNT_MUST_BE_POSITIVE",
			},
		}
	case errors.Is(err, txn.ErrAmountTooLarge):
		return &gqlerror.Error{
			Message: "Amount must be at most 9 digits (999,999,999)",
			Extensions: map[string]interface{}{
				"code": "AMOUNT_TOO_LARGE",
			},
		}

	// Ledger account constraints (for journal entries)
	case errors.Is(err, txn.ErrLedgerAccountNotFound):
		return &gqlerror.Error{
			Message: "Ledger account not found",
			Extensions: map[string]interface{}{
				"code": "LEDGER_ACCOUNT_NOT_FOUND",
			},
		}
	case errors.Is(err, txn.ErrLedgerAccountArchived):
		return &gqlerror.Error{
			Message: "Cannot use an archived ledger account",
			Extensions: map[string]interface{}{
				"code": "LEDGER_ACCOUNT_ARCHIVED",
			},
		}
	case errors.Is(err, txn.ErrLedgerAccountIsGroup):
		return &gqlerror.Error{
			Message: "Cannot use a group ledger account for journal entries",
			Extensions: map[string]interface{}{
				"code": "LEDGER_ACCOUNT_IS_GROUP",
			},
		}

	// Transaction field validation
	case errors.Is(err, txn.ErrDescriptionRequired):
		return &gqlerror.Error{
			Message: "Description is required",
			Extensions: map[string]interface{}{
				"code": "DESCRIPTION_REQUIRED",
			},
		}
	case errors.Is(err, txn.ErrDescriptionTooLong):
		return &gqlerror.Error{
			Message: "Description must be at most 300 characters",
			Extensions: map[string]interface{}{
				"code": "DESCRIPTION_TOO_LONG",
			},
		}

	default:
		return &gqlerror.Error{
			Message: "Internal server error",
			Extensions: map[string]interface{}{
				"code": "INTERNAL_SERVER_ERROR",
			},
		}
	}
}

func Recover(ctx context.Context, v interface{}) error {
	logging.Critical(ctx, "panic recovered in GraphQL resolver", slog.Any("error", v))

	return errors.New("internal server error")
}
