package model

import (
	"time"

	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

type Transaction struct {
	ID          prid.ID         `json:"id"`
	Entries     []*JournalEntry `json:"entries"`
	Date        date.Date       `json:"date"`
	Description string          `json:"description"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}

func (Transaction) IsNode()             {}
func (this Transaction) GetID() prid.ID { return this.ID }
