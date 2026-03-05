package model

import (
	"time"

	"github.com/suda-3156/kkb/go/internal/prid"
)

type LedgerAccount struct {
	ID         prid.ID           `json:"id"`
	Parent     *LedgerAccount    `json:"parent,omitempty"`
	Name       string            `json:"name"`
	Kind       LedgerAccountKind `json:"kind"`
	IsGroup    bool              `json:"isGroup"`
	ArchivedAt *time.Time        `json:"archivedAt,omitempty"`
	CreatedAt  time.Time         `json:"createdAt"`
	UpdatedAt  time.Time         `json:"updatedAt"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}

func (LedgerAccount) IsNode()             {}
func (this LedgerAccount) GetID() prid.ID { return this.ID }
