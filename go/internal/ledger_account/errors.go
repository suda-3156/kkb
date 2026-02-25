package ledgeraccount

import (
	"errors"
)

// Account lifecycle
var (
	ErrAccountNotFound        = errors.New("ledger account not found")
	ErrAccountAlreadyArchived = errors.New("ledger account is already archived")
	ErrAccountModified        = errors.New("ledger account has been modified by another process")
)

// Parent constraints
var (
	ErrParentNotFound              = errors.New("parent ledger account not found")
	ErrParentArchived              = errors.New("cannot use an archived account as parent")
	ErrParentNotGroup              = errors.New("parent ledger account must be a group")
	ErrParentKindMismatch          = errors.New("parent ledger account kind must match the new account kind")
	ErrParentIsArchivedOnUnarchive = errors.New("cannot unarchive an account whose parent is archived")
)

// Name validation
var (
	ErrNameRequired = errors.New("name is required")
	ErrNameTooLong  = errors.New("name must be at most 100 characters")
)

// Structural constraints
var (
	ErrCannotSetSelfAsParent              = errors.New("cannot set itself as parent")
	ErrConflictingParentOps               = errors.New("cannot set and unset parent at the same time")
	ErrCannotChangeToNonGroupWithChildren = errors.New("cannot change to non-group account while it has child accounts")
)
