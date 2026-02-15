package model

import (
	"time"

	"github.com/suda-3156/kkb/go/pkg/pulid"
)

type JournalEntry struct {
	ID            pulid.ID         `json:"id"`
	LedgerAccount *LedgerAccount   `json:"ledgerAccount"`
	Amount        int32            `json:"amount"`
	Kind          JournalEntryKind `json:"kind"`
	CreatedAt     time.Time        `json:"createdAt"`
	UpdatedAt     time.Time        `json:"updatedAt"`

	// Internal field for efficient querying
	LedgerAccountIDInt int `json:"-"`
}

func (JournalEntry) IsNode()              {}
func (this JournalEntry) GetID() pulid.ID { return this.ID }
