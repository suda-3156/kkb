import type { JournalEntryKind, SubscriptionStatus } from "@/graph/graphql"

/**
 * Pure helpers for the subscription management view. The ideal calendar (a
 * fixed month of days 1 to 31, no weekdays) places each subscription on its
 * billing day-of-month; everything here derives display values from the
 * subscription fields alone.
 */

/** The 1..31 days the ideal calendar displays. */
export const IDEAL_CALENDAR_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/**
 * The billing day-of-month, taken from the anchor date. The anchor is the
 * sticky base the server derives every occurrence day from, so a month-end
 * subscription stays on 31 even while a clamped February bills on 28.
 */
export const billingDay = (anchorOn: string): number => Number(anchorOn.slice(8, 10))

/** "毎月" / "n か月ごと" / "年払い". */
export const intervalLabel = (intervalMonths: number): string => {
  if (intervalMonths === 1) return "毎月"
  if (intervalMonths === 12) return "年払い"
  return `${intervalMonths}か月ごと`
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "利用中",
  PAUSED: "休止中",
  CANCELED: "解約済み",
}

/** Total of the debit side; template entries and journal entries share the shape. */
export const debitTotal = (
  entries: readonly { amount: number; kind: JournalEntryKind }[],
): number => entries.filter((e) => e.kind === "DEBIT").reduce((sum, e) => sum + e.amount, 0)

/** "M/D" from a YYYY-MM-DD string, without zero padding. */
export const monthDayLabel = (dateStr: string): string => {
  const [, m, d] = dateStr.split("-")
  return `${Number(m)}/${Number(d)}`
}

type CalendarSubscription = {
  anchorOn: string
  status: SubscriptionStatus
}

/**
 * Group subscriptions by billing day for the ideal calendar. Canceled ones
 * never bill again, so they are left off the calendar entirely (they live in
 * the separate canceled section).
 */
export const groupByBillingDay = <S extends CalendarSubscription>(
  subs: readonly S[],
): Map<number, S[]> => {
  const byDay = new Map<number, S[]>()
  for (const sub of subs) {
    if (sub.status === "CANCELED") continue
    const day = billingDay(sub.anchorOn)
    const existing = byDay.get(day)
    if (existing) {
      existing.push(sub)
    } else {
      byDay.set(day, [sub])
    }
  }
  return byDay
}

export type OccurrenceDisplay = "materialized" | "deleted" | "skipped"

/**
 * How one payment-history row reads. The materialization log is the source of
 * truth: a MATERIALIZED row whose transaction is gone was auto-entered and
 * then deleted by hand, and the history keeps saying so.
 */
export const occurrenceDisplay = (
  outcome: "MATERIALIZED" | "SKIPPED",
  hasTransaction: boolean,
): OccurrenceDisplay => {
  if (outcome === "SKIPPED") return "skipped"
  return hasTransaction ? "materialized" : "deleted"
}
