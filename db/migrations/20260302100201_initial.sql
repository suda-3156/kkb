-- Create "ledger_encryption_keys" table
CREATE TABLE `ledger_encryption_keys` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `aad` tinyblob NOT NULL,
  `wrapped_cipher` blob NOT NULL,
  `allowed` bool NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "ledger_accounts" table
CREATE TABLE `ledger_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `public_id` char(30) NOT NULL,
  `account_name` blob NOT NULL,
  `kind` enum('ASSET','LIABILITY','EXPENSE','REVENUE','EQUITY') NOT NULL,
  `is_group` bool NOT NULL,
  `archived_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ledger_account_children` bigint NULL,
  `ledger_encryption_key_ledger_accounts` bigint NULL,
  PRIMARY KEY (`id`),
  INDEX `ledger_accounts_ledger_accounts_children` (`ledger_account_children`),
  INDEX `ledger_accounts_ledger_encryption_keys_ledger_accounts` (`ledger_encryption_key_ledger_accounts`),
  UNIQUE INDEX `public_id` (`public_id`),
  CONSTRAINT `ledger_accounts_ledger_accounts_children` FOREIGN KEY (`ledger_account_children`) REFERENCES `ledger_accounts` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL,
  CONSTRAINT `ledger_accounts_ledger_encryption_keys_ledger_accounts` FOREIGN KEY (`ledger_encryption_key_ledger_accounts`) REFERENCES `ledger_encryption_keys` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "transactions" table
CREATE TABLE `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `public_id` char(30) NOT NULL,
  `date` char(10) NOT NULL,
  `description` blob NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ledger_encryption_key_transactions` bigint NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `public_id` (`public_id`),
  INDEX `transactions_ledger_encryption_keys_transactions` (`ledger_encryption_key_transactions`),
  CONSTRAINT `transactions_ledger_encryption_keys_transactions` FOREIGN KEY (`ledger_encryption_key_transactions`) REFERENCES `ledger_encryption_keys` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "journal_entries" table
CREATE TABLE `journal_entries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `public_id` char(30) NOT NULL,
  `amount` int NOT NULL,
  `kind` enum('DEBIT','CREDIT') NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ledger_account_journal_entries` bigint NOT NULL,
  `transaction_entries` bigint NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `journal_entries_ledger_accounts_journal_entries` (`ledger_account_journal_entries`),
  INDEX `journal_entries_transactions_entries` (`transaction_entries`),
  UNIQUE INDEX `public_id` (`public_id`),
  CONSTRAINT `journal_entries_ledger_accounts_journal_entries` FOREIGN KEY (`ledger_account_journal_entries`) REFERENCES `ledger_accounts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `journal_entries_transactions_entries` FOREIGN KEY (`transaction_entries`) REFERENCES `transactions` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
