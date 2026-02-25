# エラーメッセージの書き方

## 基本方針

`fmt.Errorf` のメッセージはログ出力での使用を前提とする。
エラーは `%w` でラップして連鎖させるため、メッセージには **どの操作中に失敗したか** だけを簡潔に示す。

---

## フォーマット

```
"<operation>: <detail>: %w"
```

- `<operation>`: 公開メソッド名またはパッケージの責務を表す動詞（小文字スネークケース）
- `<detail>`: その操作内のどのステップか（省略可）
- パッケージ名・型名は **含めない**（呼び出し元のスタックから自明なため）

---

## ルール

### 1. package context は省略する

パッケージ名や型名をメッセージに含めない。
ログのスタックトレースや呼び出し元で自明であるため冗長になる。

```go
// Bad
fmt.Errorf("failed to query ledger account: %w", err)

// Good
fmt.Errorf("archive: query account: %w", err)
```

### 2. outer wrapping は薄くする

`WithTx` などトランザクションの外側でラップする場合は、operation 名のみにとどめる。
詳細は inner のエラーから伝播させる。

```go
// Bad
return nil, fmt.Errorf("failed to archive ledger account: %w", err)

// Good
return nil, fmt.Errorf("archive: %w", err)
```

### 3. ステップが複数あるときは連結する

同一 operation 内でさらにステップを区別する場合は `:` で連結する。

```go
fmt.Errorf("archive: query account: %w", err)
fmt.Errorf("archive: bulk update: %w", err)
fmt.Errorf("archive: reload after update: %w", err)
```

### 4. 動的な値はメッセージに含めてよい

どのデータに対する処理かを特定するのに有用な場合は値を添える。

```go
fmt.Errorf("archive: query children of id=%d: %w", currentID, err)
```

### 5. helper / 変換関数は関数名を operation にする

公開メソッドではない内部 helper は関数名をそのまま使う。

```go
fmt.Errorf("convertToGraph: decrypt name: %w", err)
```

---

## 命名例

| operation            | detail 例                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `create`             | `query parent`, `save`, `encrypt name`                                                         |
| `update`             | `query account`, `query parent`, `count children`, `save`, `reload after save`, `encrypt name` |
| `archive`            | `query account`, `bulk update`, `reload after update`, `query children of id=%d`               |
| `unarchive`          | `query account`, `clear archived_at`                                                           |
| `get by public id`   | ―（単一ステップのため detail 不要）                                                            |
| `get by internal id` | ―（単一ステップのため detail 不要）                                                            |
| `list`               | `query`, `page info`, `check hasPreviousPage`, `check hasNextPage`                             |
| `convertToGraph`     | `decrypt name`                                                                                 |
