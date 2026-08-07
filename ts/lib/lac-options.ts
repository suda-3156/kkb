import { LedgerAccountKind } from "@/graph/graphql"
import type { AccountOrder } from "@/lib/settings"

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
  createdAt: string
  /**
   * 最後にこの科目を使った取引の取引日。未使用なら null。
   * nullable なフィールドは codegen が optional にするので undefined も受ける。
   */
  lastUsedAt?: string | null
  /** その取引を記録した時刻。取引日が同着のときだけ見る。 */
  lastRecordedAt?: string | null
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

/** 時刻文字列を比較用の数値にする。未設定・壊れた値は「最も古い」に倒す。 */
const timeValue = (value: string | null | undefined): number => {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

/**
 * 昇順比較。差分ではなく大小で返すのは、両方が -Infinity(= 値なし)のときに
 * 引き算が NaN になり、比較関数として壊れるため。
 */
const compareAsc = (a: number, b: number): number => (a === b ? 0 : a < b ? -1 : 1)

/**
 * 作成順。**サーバの返す順ではない**。
 *
 * `public_id` は完全ランダムなので、サーバの既定の並び(public_id 昇順)は
 * 安定なだけで作成順ではない。作成順で見せるにはここで並べ替えるしかない。
 */
const byCreatedAt = (a: AccountOption, b: AccountOption): number =>
  compareAsc(timeValue(a.createdAt), timeValue(b.createdAt))

/**
 * 直近に使った順。取引日の降順で並べ、**同じ日に使った科目は記録時刻の降順**で解く。
 *
 * 取引日は日単位なので同着が必ず出る。しかも同着は「今日使った科目」に集中する
 * ため、第 2 キーが無いと一番効いてほしい上位が並ばない。
 *
 * 一度も使っていない科目は取引日が null で、常に末尾。未使用同士は作成順にする
 * (サーバの返す順はランダムなので、最後のキーを置かないと並びが安定しない)。
 */
const byLastUsed = (a: AccountOption, b: AccountOption): number => {
  const aUsedAt = a.lastUsedAt ?? null
  const bUsedAt = b.lastUsedAt ?? null

  if (aUsedAt !== bUsedAt) {
    if (aUsedAt === null) return 1
    if (bUsedAt === null) return -1
    // 取引日は YYYY-MM-DD なので文字列比較がそのまま日付順になる
    return aUsedAt < bUsedAt ? 1 : -1
  }

  const recorded = compareAsc(timeValue(b.lastRecordedAt), timeValue(a.lastRecordedAt))
  return recorded !== 0 ? recorded : byCreatedAt(a, b)
}

export type LastUsedFields = Pick<AccountOption, "lastUsedAt" | "lastRecordedAt">

/**
 * 取引を 1 件記録したときの、その科目の直近利用の進め方。
 *
 * サーバは全取引の MAX を返すが、記録した直後にそれを取り直すと、入力を続けて
 * いる最中に往復が入る。**同じ MAX の規則をクライアント側で 1 件ぶんだけ進める**
 * ことで、取り直さずに並びを合わせる。
 *
 * 進まない場合(過去日の取引を後から入れたときなど)は null を返す。MAX は下がら
 * ないので、書き戻してはいけない。
 */
export const bumpLastUsed = (
  current: LastUsedFields | null | undefined,
  used: { date: string; recordedAt: string },
): LastUsedFields | null => {
  const next = { lastUsedAt: used.date, lastRecordedAt: used.recordedAt }

  const currentDate = current?.lastUsedAt ?? null
  if (currentDate === null) return next

  // 取引日は YYYY-MM-DD なので文字列比較がそのまま日付順になる
  if (used.date !== currentDate) return used.date > currentDate ? next : null

  // 同じ取引日なら記録時刻の方で進む。ここが並びの第 2 キーそのもの。
  return timeValue(used.recordedAt) > timeValue(current?.lastRecordedAt) ? next : null
}

/**
 * クエリ結果を種別ごとのグループに束ねる。
 *
 * - null / undefined のノードは落とす(GraphQL の nodes が nullable なため)
 * - グループ科目 (`isGroup`) は仕訳に使えないので落とす
 * - 並びは KIND_ORDER。**並べ替えは種別グループの中だけ**で、グループ自体の
 *   並びは順序設定によらず KIND_ORDER のまま
 * - 候補が 0 件の種別はグループごと落とす
 *
 * `kind` を指定した場合はその種別だけが対象になる。サーバ側でも絞っているが、
 * Apollo のキャッシュから別種別が混ざっても表示が壊れないようここでも絞る。
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
      // sort は破壊的なので filter の結果(新しい配列)に対してだけ呼ぶ
      items: options.filter((option) => option.kind === k).sort(compare),
    }))
    .filter((group) => group.items.length > 0)
}
