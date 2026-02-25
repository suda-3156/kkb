package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/suda-3156/kkb/go/internal/date"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

// Transaction holds the schema definition for the Transaction entity.
type Transaction struct {
	ent.Schema
}

// Fields of the Transaction.
func (Transaction) Fields() []ent.Field {
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
		field.String("date").
			GoType(date.Date("")).
			SchemaType(map[string]string{
				"mysql": "char(10)",
			}).
			MaxLen(10).
			MinLen(10).
			NotEmpty(),
		field.Bytes("description").
			// Encrypted field.
			// TODO: MaxLen
			NotEmpty(),
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

// Edges of the Transaction.
func (Transaction) Edges() []ent.Edge {
	return []ent.Edge{
		// Journal entries in this transaction
		edge.To("entries", JournalEntry.Type),
		// Ledger encryption key used for encrypting this transaction's data
		edge.From("encryption_key", LedgerEncryptionKey.Type).
			Ref("transactions").
			Unique(),
	}
}
