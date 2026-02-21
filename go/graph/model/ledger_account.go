package model

import (
	"time"

	"github.com/suda-3156/kkb/go/internal/pulid"
)

type LedgerAccount struct {
	ID         pulid.ID          `json:"id"`
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

func (LedgerAccount) IsNode()              {}
func (this LedgerAccount) GetID() pulid.ID { return this.ID }
