package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// LedgerEncryptionKey holds the schema definition for the LedgerEncryptionKey entity.
type LedgerEncryptionKey struct {
	ent.Schema
}

// Fields of the LedgerEncryptionKey.
func (LedgerEncryptionKey) Fields() []ent.Field {
	return []ent.Field{
		field.Bytes("aad").
			MaxLen(32), // AAD will be 16 bytes. Just in case we want to add some metadata in the future.
		field.Bytes("wrapped_cipher").
			// Encrypted field
			MaxLen(256), // 32 bytes Key + ~ 100 bytes overhead
		field.Bool("allowed").
			Default(true),
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

// Edges of the LedgerEncryptionKey.
func (LedgerEncryptionKey) Edges() []ent.Edge {
	return []ent.Edge{
		// Ledger accounts using this key for encrypting their data
		edge.To("ledger_accounts", LedgerAccount.Type),
		// Transactions using this key for encrypting their data
		edge.To("transactions", Transaction.Type),
	}
}
