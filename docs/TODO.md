# TODO

## go

- `usecase/ledger_account/create.go`: `is_group = false`のledger accountをparentに指定した時に、parentを`is_group = true`に変更する
- `ledger account` で、parent が指定されていない時に、queryで要求された時の振る舞い。
- Cloud KMSの対称モードでのオーバーヘッド長を検証した上で「日本語の文字数 x 定数 + オーバーヘッド長」でDBのスキーマを作成する。

### future

- DEK, KMS
  - 1. Store the DEK to DB and encrypt and decrypt it by the KEK in config file.
  - 2. Encrypt and decrypt the DEK using Cloud KMS.
  - 3. Use local (inside container) cache for the DEK encryption and decryption.
