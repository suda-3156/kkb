package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/suda-3156/kkb/go/internal/date"
)

// SubscriptionOccurrence holds the schema definition for the SubscriptionOccurrence entity.
// It logs what the job did per occurrence date. It holds no user content, so
// nothing here is encrypted, and it never references a transaction: transactions
// are hard-deleted, so the log must survive on its own.
type SubscriptionOccurrence struct {
	ent.Schema
}

// Occurrence outcome Enum
// Ref: https://entgo.io/docs/schema-fields#enum-fields
type OccurrenceOutcome string

const (
	Materialized OccurrenceOutcome = "MATERIALIZED"
	Skipped      OccurrenceOutcome = "SKIPPED"
)

func (OccurrenceOutcome) Values() (outcomes []string) {
	for _, o := range []OccurrenceOutcome{
		Materialized,
		Skipped,
	} {
		outcomes = append(outcomes, string(o))
	}
	return
}

func (o OccurrenceOutcome) String() string {
	return string(o)
}

// Fields of the SubscriptionOccurrence.
func (SubscriptionOccurrence) Fields() []ent.Field {
	return []ent.Field{
		field.String("occurrence_on").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		field.Enum("outcome").
			GoType(OccurrenceOutcome("")),
		field.Time("created_at").
			SchemaType(map[string]string{
				"mysql": "datetime(6)",
			}).
			Immutable().
			Default(time.Now),
	}
}

// Edges of the SubscriptionOccurrence.
func (SubscriptionOccurrence) Edges() []ent.Edge {
	return []ent.Edge{
		// Subscription this occurrence belongs to
		edge.From("subscription", Subscription.Type).
			Ref("occurrences").
			Unique().
			Required(),
	}
}

// Indexes of the SubscriptionOccurrence.
func (SubscriptionOccurrence) Indexes() []ent.Index {
	return []ent.Index{
		// Second line of defense for idempotency: the primary guarantee is the
		// monotonic advance of Subscription.next_occurrence_on, but double
		// counting is unrecoverable in a ledger, so the DB enforces it too.
		index.Fields("occurrence_on").
			Edges("subscription").
			Unique(),
	}
}
