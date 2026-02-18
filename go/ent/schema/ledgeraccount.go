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

// Ledger Account kind Enum
// Ref: https://entgo.io/docs/schema-fields#enum-fields
type LedgerAccountKind string

const (
	Asset     LedgerAccountKind = "ASSET"
	Liability LedgerAccountKind = "LIABILITY"
	Expense   LedgerAccountKind = "EXPENSE"
	Revenue   LedgerAccountKind = "REVENUE"
	Equity    LedgerAccountKind = "EQUITY"
)

func (LedgerAccountKind) Values() (kinds []string) {
	for _, k := range []LedgerAccountKind{
		Asset,
		Liability,
		Expense,
		Revenue,
		Equity,
	} {
		kinds = append(kinds, string(k))
	}
	return
}

// Fields of the LedgerAccount.
func (LedgerAccount) Fields() []ent.Field {
	return []ent.Field{
		field.String("public_id").
			// prefix: "lac_"
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
			// Encrypted field
			// MaxLen(). // TODO: Set max length for account name
			NotEmpty(),
		field.Enum("kind").
			GoType(LedgerAccountKind("")),
		field.Bool("is_group"),
		field.Bytes("archived_at").
			// Encrypted field
			// Null or datetime string in 2006-01-02T15:04:05+09:00 format
			// MaxLen(). // TODO: Set max length for archived_at
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
		// Due to ent's naming convention, the column name in the database schema
		// will be "ledger_account_children", but this column actually stores
		// the parent ID (nullable).
		edge.To("children", LedgerAccount.Type).
			From("parent").
			Unique(),
		// Journal entries using this account
		// edge.To("journal_entries", JournalEntry.Type),
	}
}
