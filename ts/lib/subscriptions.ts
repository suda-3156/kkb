import type { JournalEntryKind, SubscriptionColor, SubscriptionStatus } from "@/graph/graphql"

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

/**
 * The display palette, in the swatch order the form shows. The DB stores the
 * token, and each token resolves to theme-aware classes here; Tailwind only
 * sees literal class strings, so every mapping is spelled out.
 */
export const SUBSCRIPTION_COLORS: readonly SubscriptionColor[] = [
  "RED",
  "ORANGE",
  "AMBER",
  "LIME",
  "EMERALD",
  "TEAL",
  "SKY",
  "BLUE",
  "VIOLET",
  "FUCHSIA",
  "PINK",
  "ROSE",
]

type ColorClasses = {
  /** Calendar chip (soft background, readable text in both themes). */
  chip: string
  /** Small solid dot (calendar cells on mobile, list rows). */
  dot: string
  /** Solid circle in the form's swatch picker. */
  swatch: string
}

export const COLOR_CLASSES: Record<SubscriptionColor, ColorClasses> = {
  RED: {
    chip: "bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
    swatch: "bg-red-500",
  },
  ORANGE: {
    chip: "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-300",
    dot: "bg-orange-500",
    swatch: "bg-orange-500",
  },
  AMBER: {
    chip: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
    dot: "bg-amber-500",
    swatch: "bg-amber-500",
  },
  LIME: {
    chip: "bg-lime-500/10 text-lime-700 hover:bg-lime-500/20 dark:text-lime-300",
    dot: "bg-lime-500",
    swatch: "bg-lime-500",
  },
  EMERALD: {
    chip: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
    dot: "bg-emerald-500",
    swatch: "bg-emerald-500",
  },
  TEAL: {
    chip: "bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:text-teal-300",
    dot: "bg-teal-500",
    swatch: "bg-teal-500",
  },
  SKY: {
    chip: "bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
    dot: "bg-sky-500",
    swatch: "bg-sky-500",
  },
  BLUE: {
    chip: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300",
    dot: "bg-blue-500",
    swatch: "bg-blue-500",
  },
  VIOLET: {
    chip: "bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
    dot: "bg-violet-500",
    swatch: "bg-violet-500",
  },
  FUCHSIA: {
    chip: "bg-fuchsia-500/10 text-fuchsia-700 hover:bg-fuchsia-500/20 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
    swatch: "bg-fuchsia-500",
  },
  PINK: {
    chip: "bg-pink-500/10 text-pink-700 hover:bg-pink-500/20 dark:text-pink-300",
    dot: "bg-pink-500",
    swatch: "bg-pink-500",
  },
  ROSE: {
    chip: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
    dot: "bg-rose-500",
    swatch: "bg-rose-500",
  },
}

/**
 * A stable automatic color for subscriptions without a chosen one: hash the
 * public ID into the palette. Deterministic, so the color survives reloads
 * and is the same on every device.
 */
export const autoColor = (id: string): SubscriptionColor => {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return SUBSCRIPTION_COLORS[hash % SUBSCRIPTION_COLORS.length]
}

/** The color to display: the chosen one, or the automatic fallback. */
export const resolveColor = (
  color: SubscriptionColor | null | undefined,
  id: string,
): SubscriptionColor => color ?? autoColor(id)

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
