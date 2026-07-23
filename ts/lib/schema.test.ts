import { describe, expect, it } from "vitest"
import { JournalEntryKind } from "@/graph/graphql"
import { expenseSchema, ledgerAccountSchema, transactionSchema } from "@/lib/schema"

const debit = (lacId: string, amount: number) => ({
  lacId,
  amount,
  kind: JournalEntryKind.Debit,
})
const credit = (lacId: string, amount: number) => ({
  lacId,
  amount,
  kind: JournalEntryKind.Credit,
})

describe("transactionSchema — double-entry balance (frontend mirror of ErrUnbalancedEntries)", () => {
  const base = { date: "2026-07-23", desc: "lunch" }

  it("accepts balanced debit/credit entries", () => {
    const result = transactionSchema.safeParse({
      ...base,
      entries: [debit("acc_a", 1000), credit("acc_b", 1000)],
    })
    expect(result.success).toBe(true)
  })

  it("rejects unbalanced entries", () => {
    const result = transactionSchema.safeParse({
      ...base,
      entries: [debit("acc_a", 1000), credit("acc_b", 900)],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes("entries"))).toBe(true)
  })

  it("rejects a zero-total transaction even if formally balanced", () => {
    // debitTotal === creditTotal === 0 is explicitly rejected.
    const result = transactionSchema.safeParse({
      ...base,
      entries: [debit("acc_a", 0), credit("acc_b", 0)],
    })
    expect(result.success).toBe(false)
  })

  it("requires at least 2 entries", () => {
    const result = transactionSchema.safeParse({
      ...base,
      entries: [debit("acc_a", 1000)],
    })
    expect(result.success).toBe(false)
  })
})

describe("expenseSchema field validation", () => {
  const valid = {
    date: "2026-07-23",
    desc: "coffee",
    amount: 500,
    paymentId: "acc_pay",
    categoryId: "acc_cat",
  }

  it("accepts a valid expense", () => {
    expect(expenseSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ["bad date format", { ...valid, date: "2026/07/23" }],
    ["empty description", { ...valid, desc: "" }],
    ["description over 300 chars", { ...valid, desc: "a".repeat(301) }],
    ["zero amount", { ...valid, amount: 0 }],
    ["negative amount", { ...valid, amount: -100 }],
    ["non-integer amount", { ...valid, amount: 100.5 }],
    ["missing payment", { ...valid, paymentId: "" }],
    ["missing category", { ...valid, categoryId: "" }],
  ])("rejects: %s", (_name, input) => {
    expect(expenseSchema.safeParse(input).success).toBe(false)
  })

  // Documents a known gap: the schema validates dates via `new Date(str)`, which
  // rolls impossible days over (2026-02-30 → 2026-03-02) instead of failing.
  // The Go backend (time.Parse) rejects these, so it is the real guard.
  it("KNOWN GAP: accepts an impossible calendar date (rolled over by Date)", () => {
    expect(expenseSchema.safeParse({ ...valid, date: "2026-02-30" }).success).toBe(true)
  })
})

describe("ledgerAccountSchema", () => {
  it("accepts a valid account", () => {
    const result = ledgerAccountSchema.safeParse({
      name: "現金",
      isGroup: false,
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty name", () => {
    expect(ledgerAccountSchema.safeParse({ name: "", isGroup: false }).success).toBe(false)
  })

  it("rejects a name over 100 chars", () => {
    expect(ledgerAccountSchema.safeParse({ name: "a".repeat(101), isGroup: false }).success).toBe(
      false,
    )
  })
})
