# TODO

## go

- slog -> zap
- env/config load strategy

### future

- DEK, KMS
  - 1. Store the DEK to DB (length: DEK byte length + 90 ~ 100 bytes) and encrypt and decrypt it by the KEK in config file.
  - 2. Encrypt and decrypt the DEK using Cloud KMS.
  - 3. Use local (inside container) cache for the DEK encryption and decryption.

- `usecase/ledger_account/create.go`: `is_group = false`のledger accountをparentに指定した時に、parentを条件付きで`is_group = true`に変更する
