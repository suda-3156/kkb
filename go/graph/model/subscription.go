package model

import (
	"time"

	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

type Subscription struct {
	ID               prid.ID              `json:"id"`
	Name             string               `json:"name"`
	RegisteredOn     date.Date            `json:"registeredOn"`
	AnchorOn         date.Date            `json:"anchorOn"`
	NextOccurrenceOn date.Date            `json:"nextOccurrenceOn"`
	CoveredThroughOn date.Date            `json:"coveredThroughOn"`
	IntervalMonths   int32                `json:"intervalMonths"`
	Status           SubscriptionStatus   `json:"status"`
	Color            *SubscriptionColor   `json:"color,omitempty"`
	TemplateEntries  []*SubscriptionEntry `json:"templateEntries"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        time.Time            `json:"updatedAt"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}

func (Subscription) IsNode()             {}
func (this Subscription) GetID() prid.ID { return this.ID }

type SubscriptionEntry struct {
	LedgerAccount *LedgerAccount   `json:"ledgerAccount"`
	Amount        int32            `json:"amount"`
	Kind          JournalEntryKind `json:"kind"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}

type SubscriptionOccurrence struct {
	OccurrenceOn date.Date         `json:"occurrenceOn"`
	Outcome      OccurrenceOutcome `json:"outcome"`
	// Null when the transaction was deleted afterwards, or the occurrence was skipped.
	Transaction *Transaction `json:"transaction,omitempty"`
	CreatedAt   time.Time    `json:"createdAt"`

	// Internal field for efficient querying
	IntID int `json:"-"`
}

type SubscriptionCalendarEntry struct {
	OccurrenceOn date.Date     `json:"occurrenceOn"`
	Subscription *Subscription `json:"subscription"`
	// Null for occurrences the job has not processed yet.
	Outcome     *OccurrenceOutcome `json:"outcome,omitempty"`
	Transaction *Transaction       `json:"transaction,omitempty"`
}
