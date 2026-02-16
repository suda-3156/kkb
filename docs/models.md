# Models

## Ledger Account

| Name         | Type              | Required | Explanation / Constraints                                                                |
| :----------- | :---------------- | :------: | :--------------------------------------------------------------------------------------- |
| id           | int               |   True   | ent default id; auto-increment; server-side only (internal id)                           |
| public_id    | pulid.ID (string) |   True   | length: 30 (prefix: "lac\_"); unique; immutable                                          |
| account_name | []byte            |   True   | non-empty; encrypted with the DEK (data encryption key); max length: TODO                |
| kind         | int               |   True   | Enum (Asset, Liability, Expense, Revenue, Equity) — TODO (choose Enum, int, or relation) |
| is_group     | bool              |   True   | whether this is a group                                                                  |
| archived_at  | []byte            |   True   | archive timestamp (nullable); encrypted with the DEK; length: TODO                       |
| created_at   | time.Time         |   True   | creation timestamp; immutable; default: current time                                     |
| updated_at   | time.Time         |   True   | update timestamp; default: current time; automatically updated on change                 |

Edges (relations):

| Edge name | Type        | Description                                   |
| :-------- | :---------- | :-------------------------------------------- |
| children  | To (self)   | children in the parent–child hierarchy        |
| parent    | From (self) | parent in the parent–child hierarchy (unique) |
