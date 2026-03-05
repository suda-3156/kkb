package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
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

func (k JournalEntryKind) String() string {
	return string(k)
}

// Fields of the JournalEntry.
func (JournalEntry) Fields() []ent.Field {
	return []ent.Field{
		field.Int32("amount").
			NonNegative(),
		field.Enum("kind").
			GoType(JournalEntryKind("")),
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
		// Journal entry doesn't have its own encryption key.
		// It uses the transaction's encryption key.
	}
}
