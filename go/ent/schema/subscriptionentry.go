package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// SubscriptionEntry holds the schema definition for the SubscriptionEntry entity.
// It is a template journal entry: the same shape as JournalEntry but without a
// date, copied into real entries when the subscription materializes.
type SubscriptionEntry struct {
	ent.Schema
}

// Fields of the SubscriptionEntry.
func (SubscriptionEntry) Fields() []ent.Field {
	return []ent.Field{
		field.Int32("amount").
			NonNegative(),
		field.Enum("kind").
			GoType(JournalEntryKind("")),
	}
}

// Edges of the SubscriptionEntry.
func (SubscriptionEntry) Edges() []ent.Edge {
	return []ent.Edge{
		// Subscription this template entry belongs to
		edge.From("subscription", Subscription.Type).
			Ref("template_entries").
			Unique().
			Required(),
		// Ledger account this template entry affects
		edge.From("ledger_account", LedgerAccount.Type).
			Ref("subscription_entries").
			Unique().
			Required(),
		// Subscription entry doesn't have its own encryption key.
		// It uses the subscription's encryption key.
	}
}
