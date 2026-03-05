package model

type JournalEntry struct {
	LedgerAccount *LedgerAccount   `json:"ledgerAccount"`
	Amount        int32            `json:"amount"`
	Kind          JournalEntryKind `json:"kind"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}
