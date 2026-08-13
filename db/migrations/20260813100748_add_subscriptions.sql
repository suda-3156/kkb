-- Create "subscriptions" table
CREATE TABLE `subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `public_id` char(20) NOT NULL,
  `name` blob NOT NULL,
  `registered_on` char(10) NOT NULL,
  `anchor_on` char(10) NOT NULL,
  `next_occurrence_on` char(10) NOT NULL,
  `covered_through_on` char(10) NOT NULL,
  `interval_months` bigint NOT NULL,
  `status` enum('ACTIVE','PAUSED','CANCELED') NOT NULL DEFAULT "ACTIVE",
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `ledger_encryption_key_subscriptions` bigint NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `public_id` (`public_id`),
  INDEX `subscriptions_ledger_encryption_keys_subscriptions` (`ledger_encryption_key_subscriptions`),
  CONSTRAINT `subscriptions_ledger_encryption_keys_subscriptions` FOREIGN KEY (`ledger_encryption_key_subscriptions`) REFERENCES `ledger_encryption_keys` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "subscription_entries" table
CREATE TABLE `subscription_entries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amount` int NOT NULL,
  `kind` enum('DEBIT','CREDIT') NOT NULL,
  `ledger_account_subscription_entries` bigint NOT NULL,
  `subscription_template_entries` bigint NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `subscription_entries_ledger_accounts_subscription_entries` (`ledger_account_subscription_entries`),
  INDEX `subscription_entries_subscriptions_template_entries` (`subscription_template_entries`),
  CONSTRAINT `subscription_entries_ledger_accounts_subscription_entries` FOREIGN KEY (`ledger_account_subscription_entries`) REFERENCES `ledger_accounts` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `subscription_entries_subscriptions_template_entries` FOREIGN KEY (`subscription_template_entries`) REFERENCES `subscriptions` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Create "subscription_occurrences" table
CREATE TABLE `subscription_occurrences` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `occurrence_on` char(10) NOT NULL,
  `outcome` enum('MATERIALIZED','SKIPPED') NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `subscription_occurrences` bigint NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `subscription_occurrences_subscriptions_occurrences` (`subscription_occurrences`),
  UNIQUE INDEX `subscriptionoccurrence_occurrence_on_subscription_occurrences` (`occurrence_on`, `subscription_occurrences`),
  CONSTRAINT `subscription_occurrences_subscriptions_occurrences` FOREIGN KEY (`subscription_occurrences`) REFERENCES `subscriptions` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
) CHARSET utf8mb4 COLLATE utf8mb4_bin;
-- Modify "transactions" table
ALTER TABLE `transactions` ADD COLUMN `subscription_transactions` bigint NULL, ADD INDEX `transactions_subscriptions_transactions` (`subscription_transactions`), ADD CONSTRAINT `transactions_subscriptions_transactions` FOREIGN KEY (`subscription_transactions`) REFERENCES `subscriptions` (`id`) ON UPDATE NO ACTION ON DELETE SET NULL;
