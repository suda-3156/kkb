package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/suda-3156/kkb/go/pkg/pulid"
)

// LedgerAccount holds the schema definition for the LedgerAccount entity.
type LedgerAccount struct {
	ent.Schema
}

// Fields of the LedgerAccount.
func (LedgerAccount) Fields() []ent.Field {
	return []ent.Field{
		field.String("public_id").
			GoType(pulid.ID("")).
			SchemaType(map[string]string{
				"mysql": "char(30)",
			}).
			MaxLen(30).
			MinLen(30).
			NotEmpty().
			Unique().
			Immutable(),
		field.Bytes("account_name").
			NotEmpty(),
		field.Int("kind").
			NonNegative(),
		field.Bool("is_group"),
		field.Bytes("archived_at").
			Optional(),
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

// Edges of the LedgerAccount.
func (LedgerAccount) Edges() []ent.Edge {
	return []ent.Edge{
		// Self-referential for parent-child hierarchy
		edge.To("children", LedgerAccount.Type).
			From("parent").
			Unique(),
		// Journal entries using this account
		// edge.To("journal_entries", JournalEntry.Type),
	}
}
