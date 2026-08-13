package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/prid"
)

// Subscription holds the schema definition for the Subscription entity.
type Subscription struct {
	ent.Schema
}

// Subscription status Enum
// Ref: https://entgo.io/docs/schema-fields#enum-fields
type SubscriptionStatus string

const (
	Active   SubscriptionStatus = "ACTIVE"
	Paused   SubscriptionStatus = "PAUSED"
	Canceled SubscriptionStatus = "CANCELED"
)

func (SubscriptionStatus) Values() (statuses []string) {
	for _, s := range []SubscriptionStatus{
		Active,
		Paused,
		Canceled,
	} {
		statuses = append(statuses, string(s))
	}
	return
}

func (s SubscriptionStatus) String() string {
	return string(s)
}

// Fields of the Subscription.
func (Subscription) Fields() []ent.Field {
	return []ent.Field{
		field.String("public_id").
			// prefix: "sub_"
			GoType(prid.ID("")).
			SchemaType(map[string]string{
				"mysql": "char(20)",
			}).
			MaxLen(20).
			MinLen(20).
			NotEmpty().
			Unique().
			Immutable(),
		field.Bytes("name").
			// Encrypted field
			MaxLen(1024). // 200 chars in UTF8mb4 (~ 800 bytes) + overhead for encryption (e.g. 28 bytes for AES-GCM)
			NotEmpty(),
		// The day the user signed up for the service, not the day this record
		// was created. Determines the initial anchor_on. Editable: recalculation
		// rules depend on whether any occurrence has been recorded.
		field.String("registered_on").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		// Base date deciding the day-of-month of occurrences. Sticky month-end
		// rounding: a rounded occurrence never moves this anchor.
		field.String("anchor_on").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		// Next date to materialize. The daily job advances this monotonically;
		// resume/uncancel may rewrite it to max(today, covered_through_on + 1 day).
		field.String("next_occurrence_on").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		// Last day of the already-paid period (inclusive). Initialized to
		// next_occurrence_on - 1 day at creation, updated with the same formula
		// only on materialization (not on skip).
		field.String("covered_through_on").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		field.Int("interval_months").
			Positive(),
		// PAUSED is a plain toggle: the job keeps skipping occurrences until the
		// user explicitly resumes. There is no auto-resume counter.
		field.Enum("status").
			GoType(SubscriptionStatus("")).
			Default(string(Active)),
		field.Time("created_at").
			SchemaType(map[string]string{
				"mysql": "datetime(6)",
			}).
			Immutable().
			Default(time.Now),
		field.Time("updated_at").
			SchemaType(map[string]string{
				"mysql": "datetime(6)",
			}).
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the Subscription.
func (Subscription) Edges() []ent.Edge {
	return []ent.Edge{
		// Template journal entries materialized into transactions
		edge.To("template_entries", SubscriptionEntry.Type),
		// Materialization/skip log. Occurrences never reference transactions:
		// transactions are hard-deleted, so the log must survive on its own.
		edge.To("occurrences", SubscriptionOccurrence.Type),
		// Transactions materialized from this subscription
		edge.To("transactions", Transaction.Type),
		// Ledger encryption key used for encrypting this subscription's data
		edge.From("encryption_key", LedgerEncryptionKey.Type).
			Ref("subscriptions").
			Unique(),
	}
}
