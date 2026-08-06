import { LedgerAccountKind } from "@/graph/graphql"

/**
 * 勘定科目コンボボックスの候補を組み立てる純粋関数群。
 *
 * Base UI の Combobox は `items` に「グループの配列」を渡すと、入力に応じて
 * グループ単位で絞り込んだうえで空グループを落とす。逆に手で items を描画すると
 * 絞り込みが一切効かないため、候補の形はここで作って必ず `items` に渡す。
 */

export type AccountOption = {
  id: string
  name: string
  kind: LedgerAccountKind
  isGroup: boolean
}

export type AccountGroup = {
  value: LedgerAccountKind
  items: AccountOption[]
}

/** 表示順。貸借対照表・損益計算書の並びに合わせている。 */
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

/**
 * クエリ結果を種別ごとのグループに束ねる。
 *
 * - null / undefined のノードは落とす(GraphQL の nodes が nullable なため)
 * - グループ科目 (`isGroup`) は仕訳に使えないので落とす
 * - 並びは KIND_ORDER。グループ内はクエリの返した順(= 作成順)を保つ
 * - 候補が 0 件の種別はグループごと落とす
 *
 * `kind` を指定した場合はその種別だけが対象になる。サーバ側でも絞っているが、
 * Apollo のキャッシュから別種別が混ざっても表示が壊れないようここでも絞る。
 */
export const buildAccountGroups = (
  nodes: readonly (AccountOption | null | undefined)[] | null | undefined,
  kind?: LedgerAccountKind,
): AccountGroup[] => {
  const options = (nodes ?? []).filter(
    (node): node is AccountOption => node != null && !node.isGroup,
  )

  const kinds = kind ? [kind] : KIND_ORDER

  return kinds
    .map((k) => ({ value: k, items: options.filter((option) => option.kind === k) }))
    .filter((group) => group.items.length > 0)
}
