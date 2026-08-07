import { LedgerAccountKind } from "@/graph/graphql"
import type { AccountOrder } from "@/lib/settings"

/**
 * Pure functions that assemble the candidate list for the ledger account combobox.
 *
 * Base UI's Combobox filters an `items` array of groups on its own, dropping the
 * groups that end up empty. Rendering the items by hand disables filtering
 * entirely, so the shape is built here and always handed to `items`.
 */

export type AccountOption = {
  id: string
  name: string
  kind: LedgerAccountKind
  isGroup: boolean
  createdAt: string
  /**
   * Transaction date of the most recent transaction using this account, or null
   * when it has never been used. Codegen makes nullable fields optional, so
   * undefined has to be accepted too.
   */
  lastUsedAt?: string | null
  /** When that transaction was recorded. Only consulted when dates tie. */
  lastRecordedAt?: string | null
}

export type AccountGroup = {
  value: LedgerAccountKind
  items: AccountOption[]
}

/** Display order, matching how a balance sheet and an income statement read. */
export const KIND_ORDER: LedgerAccountKind[] = [
  LedgerAccountKind.Asset,
  LedgerAccountKind.Liability,
  LedgerAccountKind.Expense,
  LedgerAccountKind.Revenue,
  LedgerAccountKind.Equity,
]

export const KIND_LABELS: Record<LedgerAccountKind, string> = {
  [LedgerAccountKind.Asset]: "資産",
  [LedgerAccountKind.Liability]: "負債",
  [LedgerAccountKind.Expense]: "費用",
  [LedgerAccountKind.Revenue]: "収益",
  [LedgerAccountKind.Equity]: "純資産",
}

/** Turn a timestamp into a comparable number. Missing or broken values sort oldest. */
const timeValue = (value: string | null | undefined): number => {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

/**
 * Ascending comparison. It returns an ordering rather than a difference because
 * subtracting two -Infinity values (both missing) yields NaN, which breaks a
 * comparator silently.
 */
const compareAsc = (a: number, b: number): number => (a === b ? 0 : a < b ? -1 : 1)

/**
 * Creation order. **Not the order the server returns.**
 *
 * `public_id` is fully random, so the server's default ordering (public_id
 * ascending) is merely stable, not chronological. Showing creation order means
 * sorting here.
 */
const byCreatedAt = (a: AccountOption, b: AccountOption): number =>
  compareAsc(timeValue(a.createdAt), timeValue(b.createdAt))

/**
 * Most recently used first: transaction date descending, **ties broken by when
 * the transaction was recorded**.
 *
 * The date has day granularity, so ties are guaranteed - and they pile up on the
 * accounts used today, which is exactly where the ordering matters most. Without
 * a second key the top of the list would not be ordered at all.
 *
 * Accounts never used have a null date and always sort last. Among those, fall
 * back to creation order: the server's order is random, so without a final key
 * the list would not be stable.
 */
const byLastUsed = (a: AccountOption, b: AccountOption): number => {
  const aUsedAt = a.lastUsedAt ?? null
  const bUsedAt = b.lastUsedAt ?? null

  if (aUsedAt !== bUsedAt) {
    if (aUsedAt === null) return 1
    if (bUsedAt === null) return -1
    // Dates are YYYY-MM-DD, so string comparison is already chronological
    return aUsedAt < bUsedAt ? 1 : -1
  }

  const recorded = compareAsc(timeValue(b.lastRecordedAt), timeValue(a.lastRecordedAt))
  return recorded !== 0 ? recorded : byCreatedAt(a, b)
}

export type LastUsedFields = Pick<AccountOption, "lastUsedAt" | "lastRecordedAt">

/**
 * How an account's last use advances when one transaction is recorded.
 *
 * The server reports the MAX over every transaction. Re-fetching that right after
 * recording would put a round trip in the middle of data entry, so **the same MAX
 * rule is applied on the client for the single new transaction** instead.
 *
 * Returns null when nothing advances - back-dating a transaction, for instance.
 * A MAX never decreases, so a non-advancing value must not be written back.
 */
export const bumpLastUsed = (
  current: LastUsedFields | null | undefined,
  used: { date: string; recordedAt: string },
): LastUsedFields | null => {
  const next = { lastUsedAt: used.date, lastRecordedAt: used.recordedAt }

  const currentDate = current?.lastUsedAt ?? null
  if (currentDate === null) return next

  // Dates are YYYY-MM-DD, so string comparison is already chronological
  if (used.date !== currentDate) return used.date > currentDate ? next : null

  // Same date: advance on the recorded time, which is the tiebreaker above
  return timeValue(used.recordedAt) > timeValue(current?.lastRecordedAt) ? next : null
}

/**
 * Group the query result by account kind.
 *
 * - Drops null and undefined nodes (the GraphQL `nodes` field is nullable)
 * - Drops group accounts (`isGroup`), which cannot appear in a journal entry
 * - Groups follow KIND_ORDER. **Sorting happens only inside a group**; the order
 *   of the groups themselves never depends on the ordering setting
 * - Drops kinds that end up with no candidates
 *
 * Passing `kind` narrows the result to that kind. The server filters too, but
 * filtering again here keeps the display intact if Apollo's cache mixes in
 * accounts of another kind.
 */
export const buildAccountGroups = (
  nodes: readonly (AccountOption | null | undefined)[] | null | undefined,
  kind?: LedgerAccountKind,
  order: AccountOrder = "created",
): AccountGroup[] => {
  const options = (nodes ?? []).filter(
    (node): node is AccountOption => node != null && !node.isGroup,
  )

  const kinds = kind ? [kind] : KIND_ORDER
  const compare = order === "lastUsed" ? byLastUsed : byCreatedAt

  return kinds
    .map((k) => ({
      value: k,
      // sort mutates, so only call it on the fresh array filter returns
      items: options.filter((option) => option.kind === k).sort(compare),
    }))
    .filter((group) => group.items.length > 0)
}
