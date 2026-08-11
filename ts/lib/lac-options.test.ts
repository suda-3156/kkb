import { describe, expect, it } from "vitest"
import type { LedgerAccountKind } from "@/graph/graphql"
import { type AccountOption, buildAccountGroups, bumpLastUsed, KIND_ORDER } from "@/lib/lac-options"

// Base UI walks the group structure handed to `items` as-is when it filters, so
// the shape built here is the specification of what the user sees.

type Overrides = Partial<Omit<AccountOption, "id" | "name" | "kind">>

const account = (
  id: string,
  name: string,
  kind: LedgerAccountKind,
  overrides: Overrides = {},
): AccountOption => ({
  id,
  name,
  kind,
  isGroup: false,
  createdAt: "2026-01-01T00:00:00Z",
  lastUsedAt: null,
  lastRecordedAt: null,
  ...overrides,
})

// createdAt increases with the id (lac_1 is the account created first).
const cash = account("lac_1", "現金", "ASSET", {
  createdAt: "2026-01-01T00:00:00Z",
})
const bank = account("lac_2", "銀行", "ASSET", {
  createdAt: "2026-01-02T00:00:00Z",
})
const food = account("lac_3", "食費", "EXPENSE", {
  createdAt: "2026-01-03T00:00:00Z",
})
const salary = account("lac_4", "給与", "REVENUE", {
  createdAt: "2026-01-04T00:00:00Z",
})
const assetGroup = account("lac_5", "資産グループ", "ASSET", {
  isGroup: true,
  createdAt: "2026-01-05T00:00:00Z",
})

/** An asset account with a last use. Only the date and recorded time matter. */
const used = (id: string, lastUsedAt: string, lastRecordedAt: string, createdAt?: string) =>
  account(id, id, "ASSET", {
    lastUsedAt,
    lastRecordedAt,
    ...(createdAt ? { createdAt } : {}),
  })

describe("buildAccountGroups", () => {
  it("groups by kind and orders the groups by KIND_ORDER", () => {
    const groups = buildAccountGroups([salary, food, cash])

    expect(groups.map((g) => g.value)).toEqual(["ASSET", "EXPENSE", "REVENUE"])
    expect(groups.map((g) => g.value)).toEqual(
      KIND_ORDER.filter((k) => groups.some((g) => g.value === k)),
    )
  })

  // Creation order is the default. The server returns public_id ascending, which is
  // random, so calling it "creation order" is a lie unless it is sorted here.
  it("orders each group by creation time, not by what the server returned", () => {
    const groups = buildAccountGroups([bank, cash])

    expect(groups[0]?.items.map((i) => i.id)).toEqual(["lac_1", "lac_2"])
  })

  it("drops a kind entirely when it has no candidates", () => {
    const groups = buildAccountGroups([cash])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.value).toBe("ASSET")
  })

  it("excludes group accounts, which cannot appear in a journal entry", () => {
    const groups = buildAccountGroups([assetGroup, cash])

    expect(groups[0]?.items).toEqual([cash])
  })

  it("drops a kind that holds only group accounts", () => {
    expect(buildAccountGroups([assetGroup])).toEqual([])
  })

  it("drops null and undefined nodes", () => {
    const groups = buildAccountGroups([null, cash, undefined])

    expect(groups[0]?.items).toEqual([cash])
  })

  it("returns an empty array when nodes is null", () => {
    expect(buildAccountGroups(null)).toEqual([])
    expect(buildAccountGroups(undefined)).toEqual([])
  })

  it("returns only the requested kind", () => {
    const groups = buildAccountGroups([cash, food, salary], "EXPENSE")

    expect(groups).toEqual([{ value: "EXPENSE", items: [food] }])
  })

  it("returns an empty array when the requested kind has no candidates", () => {
    expect(buildAccountGroups([cash], "REVENUE")).toEqual([])
  })
})

describe("buildAccountGroups - lastUsed", () => {
  const ordered = (nodes: AccountOption[]) =>
    buildAccountGroups(nodes, undefined, "lastUsed")[0]?.items.map((i) => i.id)

  it("orders by transaction date, most recent first", () => {
    const old = used("old", "2026-07-01", "2026-07-01T10:00:00Z")
    const recent = used("recent", "2026-08-06", "2026-08-06T10:00:00Z")

    expect(ordered([old, recent])).toEqual(["recent", "old"])
  })

  // The date has day granularity, so ties happen - and they pile up on the accounts
  // used today, which is exactly where the ordering matters most.
  it("breaks a date tie by recorded time, most recent first", () => {
    const morning = used("morning", "2026-08-06", "2026-08-06T09:00:00Z")
    const night = used("night", "2026-08-06", "2026-08-06T23:00:00Z")

    expect(ordered([morning, night])).toEqual(["night", "morning"])
  })

  it("ranks a newer transaction date above an older one even if recorded earlier", () => {
    // A transaction dated 8/6 that was recorded back on 8/1
    const backdated = used("backdated", "2026-08-06", "2026-08-01T10:00:00Z")
    const recorded = used("recorded", "2026-08-05", "2026-08-07T10:00:00Z")

    expect(ordered([backdated, recorded])).toEqual(["backdated", "recorded"])
  })

  it("sorts never-used accounts last", () => {
    const unused = account("unused", "未使用", "ASSET")
    const usedOnce = used("used", "2026-07-01", "2026-07-01T10:00:00Z")

    expect(ordered([unused, usedOnce])).toEqual(["used", "unused"])
  })

  // Without a final key, never-used accounts would keep the server's random order.
  it("orders never-used accounts by creation time", () => {
    const later = account("later", "後", "ASSET", {
      createdAt: "2026-02-01T00:00:00Z",
    })
    const earlier = account("earlier", "先", "ASSET", {
      createdAt: "2026-01-01T00:00:00Z",
    })

    expect(ordered([later, earlier])).toEqual(["earlier", "later"])
  })

  it("falls back to creation time when date and recorded time both tie", () => {
    const later = used("later", "2026-08-06", "2026-08-06T10:00:00Z", "2026-02-01T00:00:00Z")
    const earlier = used("earlier", "2026-08-06", "2026-08-06T10:00:00Z", "2026-01-01T00:00:00Z")

    expect(ordered([later, earlier])).toEqual(["earlier", "later"])
  })

  it("sorts only inside a group and leaves the group order at KIND_ORDER", () => {
    const oldAsset = account("lac_1", "現金", "ASSET", {
      lastUsedAt: "2026-07-01",
      lastRecordedAt: "2026-07-01T10:00:00Z",
    })
    const newExpense = account("lac_3", "食費", "EXPENSE", {
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T10:00:00Z",
    })

    const groups = buildAccountGroups([newExpense, oldAsset], undefined, "lastUsed")

    expect(groups.map((g) => g.value)).toEqual(["ASSET", "EXPENSE"])
  })

  it("does not mutate the input array", () => {
    const first = used("first", "2026-07-01", "2026-07-01T10:00:00Z")
    const second = used("second", "2026-08-06", "2026-08-06T10:00:00Z")
    const nodes = [first, second]

    buildAccountGroups(nodes, undefined, "lastUsed")

    expect(nodes).toEqual([first, second])
  })
})

// Applies the server's MAX rule locally for the one transaction just recorded.
// If the rule drifts, the list jumps the moment the data is fetched again.
describe("bumpLastUsed", () => {
  const now = { date: "2026-08-06", recordedAt: "2026-08-06T12:00:00Z" }

  it("takes the new value for an account never used before", () => {
    expect(bumpLastUsed(null, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("takes the new value when the cache holds no last use yet", () => {
    expect(bumpLastUsed({ lastUsedAt: null, lastRecordedAt: null }, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("advances on a newer transaction date", () => {
    const current = { lastUsedAt: "2026-08-01", lastRecordedAt: "2026-08-01T10:00:00Z" }

    expect(bumpLastUsed(current, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  // A MAX never decreases: back-dating a transaction leaves the last use alone.
  it("does not advance when the transaction is back-dated", () => {
    const current = { lastUsedAt: "2026-08-10", lastRecordedAt: "2026-08-10T10:00:00Z" }

    expect(bumpLastUsed(current, now)).toBeNull()
  })

  it("advances only the recorded time when the date is unchanged", () => {
    const current = { lastUsedAt: "2026-08-06", lastRecordedAt: "2026-08-06T09:00:00Z" }

    expect(bumpLastUsed(current, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("writes nothing back when neither date nor recorded time advances", () => {
    const current = { lastUsedAt: "2026-08-06", lastRecordedAt: "2026-08-06T18:00:00Z" }

    expect(bumpLastUsed(current, now)).toBeNull()
  })
})
