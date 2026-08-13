package subscription

import "errors"

// Subscription lifecycle
var (
	ErrSubscriptionNotFound = errors.New("subscription not found")
	ErrSubscriptionModified = errors.New("subscription has been modified by another process")
	ErrSubscriptionCanceled = errors.New("subscription is canceled; uncancel it first")
)

// Template entries validation
var (
	ErrEntriesRequired      = errors.New("at least 2 template entries are required")
	ErrUnbalancedEntries    = errors.New("total debits must equal total credits")
	ErrAmountMustBePositive = errors.New("amount must be positive")
	ErrAmountTooLarge       = errors.New("amount must be at most 9 digits (999,999,999)")
)

// Ledger account constraints
var (
	ErrLedgerAccountNotFound = errors.New("ledger account not found")
	ErrLedgerAccountArchived = errors.New("cannot use an archived ledger account")
	ErrLedgerAccountIsGroup  = errors.New("cannot use a group ledger account for subscription entries")
)

// Field validation
var (
	ErrNameRequired           = errors.New("name is required")
	ErrNameTooLong            = errors.New("name must be at most 200 characters")
	ErrIntervalMustBePositive = errors.New("intervalMonths must be at least 1")
	ErrInvalidMonth           = errors.New("month must be between 1 and 12")
	ErrInvalidYear            = errors.New("year must be between 1970 and 9999")
)
