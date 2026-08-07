import { describe, expect, it } from "vitest"
import { LedgerAccountKind } from "@/graph/graphql"
import { type AccountOption, buildAccountGroups, bumpLastUsed, KIND_ORDER } from "@/lib/lac-options"

// Base UI の絞り込みは items に渡したグループ構造をそのまま辿るため、
// ここで作る形が候補表示の仕様そのものになる。

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

// createdAt は id の順に新しくしてある(lac_1 が最初に作られた科目)。
const cash = account("lac_1", "現金", LedgerAccountKind.Asset, {
  createdAt: "2026-01-01T00:00:00Z",
})
const bank = account("lac_2", "銀行", LedgerAccountKind.Asset, {
  createdAt: "2026-01-02T00:00:00Z",
})
const food = account("lac_3", "食費", LedgerAccountKind.Expense, {
  createdAt: "2026-01-03T00:00:00Z",
})
const salary = account("lac_4", "給与", LedgerAccountKind.Revenue, {
  createdAt: "2026-01-04T00:00:00Z",
})
const assetGroup = account("lac_5", "資産グループ", LedgerAccountKind.Asset, {
  isGroup: true,
  createdAt: "2026-01-05T00:00:00Z",
})

/** 直近利用のある資産科目。取引日と記録時刻だけを指定する。 */
const used = (id: string, lastUsedAt: string, lastRecordedAt: string, createdAt?: string) =>
  account(id, id, LedgerAccountKind.Asset, {
    lastUsedAt,
    lastRecordedAt,
    ...(createdAt ? { createdAt } : {}),
  })

describe("buildAccountGroups", () => {
  it("種別ごとにまとめ、KIND_ORDER の順に並べる", () => {
    const groups = buildAccountGroups([salary, food, cash])

    expect(groups.map((g) => g.value)).toEqual([
      LedgerAccountKind.Asset,
      LedgerAccountKind.Expense,
      LedgerAccountKind.Revenue,
    ])
    expect(groups.map((g) => g.value)).toEqual(
      KIND_ORDER.filter((k) => groups.some((g) => g.value === k)),
    )
  })

  // 既定は作成順。サーバの返す順は public_id 昇順 = ランダムなので、
  // 「作成順」を名乗る以上ここで並べ替えないと嘘になる。
  it("グループ内を作成順に並べる(サーバの返した順ではない)", () => {
    const groups = buildAccountGroups([bank, cash])

    expect(groups[0]?.items.map((i) => i.id)).toEqual(["lac_1", "lac_2"])
  })

  it("候補が 0 件の種別はグループごと落とす", () => {
    const groups = buildAccountGroups([cash])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.value).toBe(LedgerAccountKind.Asset)
  })

  it("グループ科目は仕訳に使えないので候補から外す", () => {
    const groups = buildAccountGroups([assetGroup, cash])

    expect(groups[0]?.items).toEqual([cash])
  })

  it("グループ科目しかない種別は空グループとして落ちる", () => {
    expect(buildAccountGroups([assetGroup])).toEqual([])
  })

  it("null / undefined のノードを落とす", () => {
    const groups = buildAccountGroups([null, cash, undefined])

    expect(groups[0]?.items).toEqual([cash])
  })

  it("nodes が null でも空配列を返す", () => {
    expect(buildAccountGroups(null)).toEqual([])
    expect(buildAccountGroups(undefined)).toEqual([])
  })

  it("kind を指定するとその種別だけを返す", () => {
    const groups = buildAccountGroups([cash, food, salary], LedgerAccountKind.Expense)

    expect(groups).toEqual([{ value: LedgerAccountKind.Expense, items: [food] }])
  })

  it("kind を指定した種別に候補が無ければ空配列を返す", () => {
    expect(buildAccountGroups([cash], LedgerAccountKind.Revenue)).toEqual([])
  })
})

describe("buildAccountGroups - lastUsed", () => {
  const ordered = (nodes: AccountOption[]) =>
    buildAccountGroups(nodes, undefined, "lastUsed")[0]?.items.map((i) => i.id)

  it("取引日の降順に並べる", () => {
    const old = used("old", "2026-07-01", "2026-07-01T10:00:00Z")
    const recent = used("recent", "2026-08-06", "2026-08-06T10:00:00Z")

    expect(ordered([old, recent])).toEqual(["recent", "old"])
  })

  // 取引日は日単位なので同着が出る。しかも同着は「今日使った科目」に集中するため、
  // ここが解けないと一番効いてほしい上位が並ばない。
  it("同じ取引日は記録時刻の降順で解く", () => {
    const morning = used("morning", "2026-08-06", "2026-08-06T09:00:00Z")
    const night = used("night", "2026-08-06", "2026-08-06T23:00:00Z")

    expect(ordered([morning, night])).toEqual(["night", "morning"])
  })

  it("取引日が新しければ記録が古くても上に来る", () => {
    // 8/6 の取引を 8/1 にさかのぼって記録した、という並び
    const backdated = used("backdated", "2026-08-06", "2026-08-01T10:00:00Z")
    const recorded = used("recorded", "2026-08-05", "2026-08-07T10:00:00Z")

    expect(ordered([backdated, recorded])).toEqual(["backdated", "recorded"])
  })

  it("一度も使っていない科目は末尾に回す", () => {
    const unused = account("unused", "未使用", LedgerAccountKind.Asset)
    const usedOnce = used("used", "2026-07-01", "2026-07-01T10:00:00Z")

    expect(ordered([unused, usedOnce])).toEqual(["used", "unused"])
  })

  // 未使用同士に順序の根拠が無いと、サーバの返すランダム順がそのまま出る。
  it("未使用同士は作成順に並べる", () => {
    const later = account("later", "後", LedgerAccountKind.Asset, {
      createdAt: "2026-02-01T00:00:00Z",
    })
    const earlier = account("earlier", "先", LedgerAccountKind.Asset, {
      createdAt: "2026-01-01T00:00:00Z",
    })

    expect(ordered([later, earlier])).toEqual(["earlier", "later"])
  })

  it("取引日も記録時刻も同じなら作成順に並べる", () => {
    const later = used("later", "2026-08-06", "2026-08-06T10:00:00Z", "2026-02-01T00:00:00Z")
    const earlier = used("earlier", "2026-08-06", "2026-08-06T10:00:00Z", "2026-01-01T00:00:00Z")

    expect(ordered([later, earlier])).toEqual(["earlier", "later"])
  })

  it("並べ替えは種別グループの中だけで、グループ自体は KIND_ORDER のまま", () => {
    const oldAsset = account("lac_1", "現金", LedgerAccountKind.Asset, {
      lastUsedAt: "2026-07-01",
      lastRecordedAt: "2026-07-01T10:00:00Z",
    })
    const newExpense = account("lac_3", "食費", LedgerAccountKind.Expense, {
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T10:00:00Z",
    })

    const groups = buildAccountGroups([newExpense, oldAsset], undefined, "lastUsed")

    expect(groups.map((g) => g.value)).toEqual([LedgerAccountKind.Asset, LedgerAccountKind.Expense])
  })

  it("入力の配列を破壊しない", () => {
    const first = used("first", "2026-07-01", "2026-07-01T10:00:00Z")
    const second = used("second", "2026-08-06", "2026-08-06T10:00:00Z")
    const nodes = [first, second]

    buildAccountGroups(nodes, undefined, "lastUsed")

    expect(nodes).toEqual([first, second])
  })
})

// サーバの MAX と同じ規則を、記録した 1 件ぶんだけ手元で進める。
// 規則がずれると、再取得した瞬間に並びが飛ぶ形で表面化する。
describe("bumpLastUsed", () => {
  const now = { date: "2026-08-06", recordedAt: "2026-08-06T12:00:00Z" }

  it("一度も使っていない科目はそのまま採用する", () => {
    expect(bumpLastUsed(null, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("キャッシュに直近利用がまだ無い科目も採用する", () => {
    expect(bumpLastUsed({ lastUsedAt: null, lastRecordedAt: null }, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("取引日が新しければ進む", () => {
    const current = { lastUsedAt: "2026-08-01", lastRecordedAt: "2026-08-01T10:00:00Z" }

    expect(bumpLastUsed(current, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  // MAX は下がらない。過去日の取引を後から入れても直近利用は動かない。
  it("過去日の取引を記録しても進めない", () => {
    const current = { lastUsedAt: "2026-08-10", lastRecordedAt: "2026-08-10T10:00:00Z" }

    expect(bumpLastUsed(current, now)).toBeNull()
  })

  it("同じ取引日なら記録時刻だけ進む", () => {
    const current = { lastUsedAt: "2026-08-06", lastRecordedAt: "2026-08-06T09:00:00Z" }

    expect(bumpLastUsed(current, now)).toEqual({
      lastUsedAt: "2026-08-06",
      lastRecordedAt: "2026-08-06T12:00:00Z",
    })
  })

  it("同じ取引日で記録時刻も進まないなら書き戻さない", () => {
    const current = { lastUsedAt: "2026-08-06", lastRecordedAt: "2026-08-06T18:00:00Z" }

    expect(bumpLastUsed(current, now)).toBeNull()
  })
})
