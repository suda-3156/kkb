import { describe, expect, it } from "vitest"
import { type JournalEntryInput, JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import {
  buildCreateTransactionInput,
  buildExpenseEntries,
  buildExpenseInput,
  buildRevenueEntries,
  buildTransactionEntries,
  buildTransferEntries,
  buildUpdateTransactionInput,
  type TransactionDetail,
  toTransactionFormValues,
} from "@/lib/journal"
import type {
  ExpenseFormValues,
  RevenueFormValues,
  TransactionFormValues,
  TransferFormValues,
} from "@/lib/schema"

// Types cannot enforce the debit/credit direction of the simple forms, so these
// cases are the real specification. They also confirm the built input survives the
// backend's balance check (ErrUnbalancedEntries).

const debitOf = (entries: JournalEntryInput[]) =>
  entries.filter((e) => e.kind === JournalEntryKind.Debit)
const creditOf = (entries: JournalEntryInput[]) =>
  entries.filter((e) => e.kind === JournalEntryKind.Credit)
const sum = (entries: JournalEntryInput[]) => entries.reduce((acc, e) => acc + e.amount, 0)

describe("buildExpenseEntries", () => {
  const values: ExpenseFormValues = {
    date: "2026-08-02",
    desc: "昼食",
    amount: 1200,
    categoryId: "lac_food",
    paymentId: "lac_cash",
  }

  it("debits the expense account and credits the payment method", () => {
    expect(buildExpenseEntries(values)).toEqual([
      { ledgerAccountId: "lac_food", amount: 1200, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_cash", amount: 1200, kind: JournalEntryKind.Credit },
    ])
  })

  it("balances debits against credits", () => {
    const entries = buildExpenseEntries(values)
    expect(sum(debitOf(entries))).toBe(sum(creditOf(entries)))
  })
})

describe("buildRevenueEntries", () => {
  const values: RevenueFormValues = {
    date: "2026-08-02",
    desc: "給与",
    amount: 250000,
    depositId: "lac_bank",
    sourceId: "lac_salary",
  }

  it("debits the receiving account and credits the revenue account", () => {
    expect(buildRevenueEntries(values)).toEqual([
      { ledgerAccountId: "lac_bank", amount: 250000, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_salary", amount: 250000, kind: JournalEntryKind.Credit },
    ])
  })

  it("貸借が一致する", () => {
    const entries = buildRevenueEntries(values)
    expect(sum(debitOf(entries))).toBe(sum(creditOf(entries)))
  })
})

describe("buildTransferEntries", () => {
  const values: TransferFormValues = {
    date: "2026-08-02",
    desc: "口座間振替",
    amount: 50000,
    fromId: "lac_bank",
    toId: "lac_cash",
  }

  it("debits the destination and credits the source", () => {
    expect(buildTransferEntries(values)).toEqual([
      { ledgerAccountId: "lac_cash", amount: 50000, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_bank", amount: 50000, kind: JournalEntryKind.Credit },
    ])
  })

  it("swaps the direction when source and destination are swapped", () => {
    const reversed = buildTransferEntries({ ...values, fromId: values.toId, toId: values.fromId })
    expect(reversed).toEqual([
      { ledgerAccountId: "lac_bank", amount: 50000, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_cash", amount: 50000, kind: JournalEntryKind.Credit },
    ])
  })
})

describe("buildTransactionEntries", () => {
  it("keeps the direction chosen for each line", () => {
    const values: TransactionFormValues = {
      date: "2026-08-02",
      desc: "クレカ払いの分割",
      entries: [
        { lacId: "lac_food", amount: 800, kind: JournalEntryKind.Debit },
        { lacId: "lac_daily", amount: 200, kind: JournalEntryKind.Debit },
        { lacId: "lac_card", amount: 1000, kind: JournalEntryKind.Credit },
      ],
    }

    const entries = buildTransactionEntries(values)

    expect(entries).toEqual([
      { ledgerAccountId: "lac_food", amount: 800, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_daily", amount: 200, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_card", amount: 1000, kind: JournalEntryKind.Credit },
    ])
    expect(sum(debitOf(entries))).toBe(sum(creditOf(entries)))
  })

  it("preserves the order of the lines", () => {
    const values: TransactionFormValues = {
      date: "2026-08-02",
      desc: "順序",
      entries: [
        { lacId: "a", amount: 1, kind: JournalEntryKind.Credit },
        { lacId: "b", amount: 1, kind: JournalEntryKind.Debit },
      ],
    }
    expect(buildTransactionEntries(values).map((e) => e.ledgerAccountId)).toEqual(["a", "b"])
  })
})

describe("build*Input", () => {
  it("maps date and desc onto the GraphQL date and description", () => {
    const input = buildExpenseInput({
      date: "2026-08-02",
      desc: "昼食",
      amount: 1200,
      categoryId: "lac_food",
      paymentId: "lac_cash",
    })

    expect(input).toEqual({
      date: "2026-08-02",
      description: "昼食",
      entries: [
        { ledgerAccountId: "lac_food", amount: 1200, kind: JournalEntryKind.Debit },
        { ledgerAccountId: "lac_cash", amount: 1200, kind: JournalEntryKind.Credit },
      ],
    })
  })

  const values: TransactionFormValues = {
    date: "2026-08-02",
    desc: "メモ",
    entries: [
      { lacId: "a", amount: 100, kind: JournalEntryKind.Debit },
      { lacId: "b", amount: 100, kind: JournalEntryKind.Credit },
    ],
  }

  it("omits id and updatedAt when creating", () => {
    expect(buildCreateTransactionInput(values)).not.toHaveProperty("id")
    expect(buildCreateTransactionInput(values)).not.toHaveProperty("updatedAt")
  })

  it("carries id and updatedAt through an update for optimistic locking", () => {
    const input = buildUpdateTransactionInput(values, {
      id: "txn_1",
      updatedAt: "2026-08-01T10:00:00Z",
    })

    expect(input).toEqual({
      id: "txn_1",
      date: "2026-08-02",
      description: "メモ",
      entries: [
        { ledgerAccountId: "a", amount: 100, kind: JournalEntryKind.Debit },
        { ledgerAccountId: "b", amount: 100, kind: JournalEntryKind.Credit },
      ],
      updatedAt: "2026-08-01T10:00:00Z",
    })
  })
})

describe("toTransactionFormValues", () => {
  const txn: TransactionDetail = {
    id: "txn_1",
    date: "2026-08-02",
    description: "昼食",
    updatedAt: "2026-08-01T10:00:00Z",
    entries: [
      {
        amount: 1200,
        kind: JournalEntryKind.Debit,
        ledgerAccount: { id: "lac_food", name: "食費", kind: LedgerAccountKind.Expense },
      },
      {
        amount: 1200,
        kind: JournalEntryKind.Credit,
        ledgerAccount: { id: "lac_cash", name: "現金", kind: LedgerAccountKind.Asset },
      },
    ],
  }

  it("turns a fetched transaction back into detailed form values", () => {
    expect(toTransactionFormValues(txn)).toEqual({
      date: "2026-08-02",
      desc: "昼食",
      entries: [
        { lacId: "lac_food", amount: 1200, kind: JournalEntryKind.Debit },
        { lacId: "lac_cash", amount: 1200, kind: JournalEntryKind.Credit },
      ],
    })
  })

  it("round-trips through build without changing the entries", () => {
    const input = buildUpdateTransactionInput(toTransactionFormValues(txn), txn)

    expect(input.entries).toEqual([
      { ledgerAccountId: "lac_food", amount: 1200, kind: JournalEntryKind.Debit },
      { ledgerAccountId: "lac_cash", amount: 1200, kind: JournalEntryKind.Credit },
    ])
    expect(input.date).toBe(txn.date)
    expect(input.description).toBe(txn.description)
  })
})
