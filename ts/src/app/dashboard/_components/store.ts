import { atom } from "jotai"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { transactionsAtom } from "../store"

// ── Helpers ───────────────────────────────────────────────────────────────

const isExpenseDebit = (entry: {
  kind: JournalEntryKind
  ledgerAccount: { kind: LedgerAccountKind }
}) =>
  entry.kind === JournalEntryKind.Debit && entry.ledgerAccount.kind === LedgerAccountKind.Expense

const startOfMonday = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday as first day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const toDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

// ── Summary (this week / this month / this year) ───────────────────────

export const expensesSummaryAtom = atom((get) => {
  const transactions = get(transactionsAtom).filter((t): t is NonNullable<typeof t> => t != null)
  const now = new Date()

  const weekStartStr = toDateKey(startOfMonday(now))
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const yearStartStr = `${now.getFullYear()}-01-01`

  let thisWeek = 0
  let thisMonth = 0
  let thisYear = 0

  for (const t of transactions) {
    const dateStr: string = t.date
    for (const e of t.entries) {
      if (isExpenseDebit(e)) {
        if (dateStr >= yearStartStr) thisYear += e.amount
        if (dateStr >= monthStartStr) thisMonth += e.amount
        if (dateStr >= weekStartStr) thisWeek += e.amount
      }
    }
  }

  return { thisWeek, thisMonth, thisYear }
})

// ── Expenses by category (current month) ─────────────────────────────────

export const monthlyExpensesByCategoryAtom = atom((get) => {
  const transactions = get(transactionsAtom).filter((t): t is NonNullable<typeof t> => t != null)
  const now = new Date()
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

  const categoryMap = new Map<string, number>()

  for (const t of transactions) {
    if (t.date < monthStartStr) continue
    for (const e of t.entries) {
      if (isExpenseDebit(e)) {
        const name = e.ledgerAccount.name
        categoryMap.set(name, (categoryMap.get(name) ?? 0) + e.amount)
      }
    }
  }

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
})

// ── Weekly expense transitions ────────────────────────────────────────────

export const weeklyExpensesAtom = atom((get) => {
  const transactions = get(transactionsAtom).filter((t): t is NonNullable<typeof t> => t != null)
  const weekMap = new Map<string, number>()

  for (const t of transactions) {
    const date = new Date(t.date)
    const key = toDateKey(startOfMonday(date))
    for (const e of t.entries) {
      if (isExpenseDebit(e)) {
        weekMap.set(key, (weekMap.get(key) ?? 0) + e.amount)
      }
    }
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, amount]) => ({ week, amount }))
})

// ── Recent 10 transactions ────────────────────────────────────────────────

export const recentTransactionsAtom = atom((get) => {
  const transactions = get(transactionsAtom).filter((t): t is NonNullable<typeof t> => t != null)
  return [...transactions]
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, 10)
})
