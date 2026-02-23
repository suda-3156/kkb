# Models

## Ledger Account

| Name         | Type              | Required | Explanation / Constraints                                                                                                                         |
| :----------- | :---------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| id           | int               |   True   | ent default id; auto-increment; server-side only (internal id)                                                                                    |
| public_id    | pulid.ID (string) |   True   | char(30); prefix: "lac\_"; unique; immutable                                                                                                      |
| account_name | []byte            |   True   | non-empty; encrypted with the DEK (data encryption key); max length: 512 bytes (nonce + ciphertext for up to ~100 UTF-8 chars + AES-GCM overhead) |
| kind         | Enum              |   True   | Enum (ASSET, LIABILITY, EXPENSE, REVENUE, EQUITY); immutable                                                                                      |
| is_group     | bool              |   True   | whether this is a group account                                                                                                                   |
| archived_at  | \*time.Time       |  False   | archive timestamp (nullable); datetime(6)                                                                                                         |
| created_at   | time.Time         |   True   | creation timestamp; datetime(6); immutable; default: current time                                                                                 |
| updated_at   | time.Time         |   True   | update timestamp; datetime(6); default: current time; automatically updated on change                                                             |

Edges (relations):

| Edge name      | Type        | Description                                                     |
| :------------- | :---------- | :-------------------------------------------------------------- |
| children       | To (self)   | children in the parent–child hierarchy                          |
| parent         | From (self) | parent in the parent–child hierarchy (unique, nullable)         |
| encryption_key | From        | the encryption key used to encrypt this account's data (unique) |

- Due to ent's naming convention, the column name in the database schema will be "ledger_account_children", but this column actually stores the parent ID (nullable).

---

## Ledger Encryption Key

| Name           | Type      | Required | Explanation / Constraints                                                             |
| :------------- | :-------- | :------: | :------------------------------------------------------------------------------------ |
| id             | int       |   True   | ent default id; auto-increment; server-side only (internal id)                        |
| aad            | []byte    |   True   | additional authenticated data used for key wrapping; max length: 32 bytes             |
| wrapped_cipher | []byte    |   True   | the DEK wrapped (encrypted) with the wrapper key (KMS); max length: 256 bytes         |
| allowed        | bool      |   True   | whether this key is currently allowed for use; default: true                          |
| created_at     | time.Time |   True   | creation timestamp; datetime(6); immutable; default: current time                     |
| updated_at     | time.Time |   True   | update timestamp; datetime(6); default: current time; automatically updated on change |

Edges (relations):

| Edge name       | Type | Description                                           |
| :-------------- | :--- | :---------------------------------------------------- |
| ledger_accounts | To   | ledger accounts whose data is encrypted with this key |
