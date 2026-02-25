package api

import (
	"context"
	"errors"
	"log/slog"

	lac "github.com/suda-3156/kkb/go/internal/ledger_account"
	"github.com/suda-3156/kkb/go/internal/logging"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

func ErrorPresenter(ctx context.Context, err error) *gqlerror.Error {
	logging.Error(ctx, "error in GraphQL resolver", slog.Any("error", err))

	switch {
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
