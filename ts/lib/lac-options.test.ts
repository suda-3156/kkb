import { describe, expect, it } from "vitest"
import { LedgerAccountKind } from "@/graph/graphql"
import { type AccountOption, buildAccountGroups, KIND_ORDER } from "@/lib/lac-options"

// Base UI の絞り込みは items に渡したグループ構造をそのまま辿るため、
// ここで作る形が候補表示の仕様そのものになる。

const account = (
  id: string,
  name: string,
  kind: LedgerAccountKind,
  isGroup = false,
): AccountOption => ({ id, name, kind, isGroup })

const cash = account("lac_1", "現金", LedgerAccountKind.Asset)
const bank = account("lac_2", "銀行", LedgerAccountKind.Asset)
const food = account("lac_3", "食費", LedgerAccountKind.Expense)
const salary = account("lac_4", "給与", LedgerAccountKind.Revenue)
const assetGroup = account("lac_5", "資産グループ", LedgerAccountKind.Asset, true)

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

  it("グループ内はクエリの返した順を保つ", () => {
    const groups = buildAccountGroups([bank, cash])

    expect(groups[0]?.items.map((i) => i.id)).toEqual(["lac_2", "lac_1"])
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
