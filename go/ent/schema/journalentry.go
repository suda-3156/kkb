package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/suda-3156/kkb/go/internal/pulid"
)

// JournalEntry holds the schema definition for the JournalEntry entity.
type JournalEntry struct {
	ent.Schema
}

// Journal Entry kind Enum
// Ref: https://entgo.io/docs/schema-fields#enum-fields
type JournalEntryKind string

const (
	Debit  JournalEntryKind = "DEBIT"
	Credit JournalEntryKind = "CREDIT"
)

func (JournalEntryKind) Values() (kinds []string) {
	for _, k := range []JournalEntryKind{
		Debit,
		Credit,
	} {
		kinds = append(kinds, string(k))
	}
	return
}

// Fields of the JournalEntry.
func (JournalEntry) Fields() []ent.Field {
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
		field.Bytes("amount").
			// Encrypted field.
			// TODO: MaxLen
			NotEmpty(),
		field.Enum("kind").
			GoType(JournalEntryKind("")),
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

// Edges of the JournalEntry.
func (JournalEntry) Edges() []ent.Edge {
	return []ent.Edge{
		// Transaction this entry belongs to
		edge.From("transaction", Transaction.Type).
			Ref("entries").
			Unique().
			Required(),
		// Ledger account this entry affects
		edge.From("ledger_account", LedgerAccount.Type).
			Ref("journal_entries").
			Unique().
			Required(),
		// Ledger encryption key used for encrypting this entry's data
		edge.From("encryption_key", LedgerEncryptionKey.Type).
			Ref("journal_entries").
			Unique(),
	}
}
