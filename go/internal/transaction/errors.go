package transaction

import "errors"

// Transaction lifecycle
var (
	ErrTransactionNotFound = errors.New("transaction not found")
	ErrTransactionModified = errors.New("transaction has been modified by another process")
)

// Journal entries validation
var (
	ErrEntriesRequired      = errors.New("at least 2 journal entries are required")
	ErrUnbalancedEntries    = errors.New("total debits must equal total credits")
	ErrAmountMustBePositive = errors.New("amount must be positive")
)

// Ledger account constraints
var (
	ErrLedgerAccountNotFound = errors.New("ledger account not found")
	ErrLedgerAccountArchived = errors.New("cannot use an archived ledger account")
	ErrLedgerAccountIsGroup  = errors.New("cannot use a group ledger account for journal entries")
)

// Field validation
var (
	ErrDescriptionRequired = errors.New("description is required")
)
