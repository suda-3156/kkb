# Plan

## Phase 1: Backend server

### [DONE] Queries: Ledger account

- create
- update
- archive
- unarchive
- fetch one
- fetch many

### [DONE] Dataloader, etc.

- error
- seeding script
- env/config

### [DONE] Queries: Transaction

- transaction
  - journal entry

- create
- update
- delete
- fetch one
- fetch many

### [DONE] go tests, github actions, etc.

- dataloader
- github actions
  - go test
  - lint

## Phase 2: Frontend, Aggregation

## Phase 3: DB Migration system (and terraform)

- migration job
- Cloud KMS client
- dev project

## Phase 4: CI/CD pipeline

- prod project
- pipeline project?

---

## Phase 5: Complexity

## Phase 6: Implement tests

## Phase N:

- Key rotation
  - requires: lock control in DB -> lock table
- Backup
  - CSV export
- DB periodic down/boot
- DB down/boot from frontend
- Periodic payment, income
