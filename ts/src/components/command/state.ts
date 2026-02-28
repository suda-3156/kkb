import { atom } from "jotai"
import type { LedgerAccountKind } from "@/graph/graphql"

export type CmdPage =
  | "closed"
  | "initial"
  | "inputExpense"
  | "inputRevenue"
  | "inputTransaction"
  | "selectLedgerAccount"
  | "committing"

export const pageLabels: Record<CmdPage, string> = {
  closed: "Closed",
  initial: "Initial",
  inputExpense: "Input Expense",
  inputRevenue: "Input Revenue",
  inputTransaction: "Input Transaction",
  selectLedgerAccount: "勘定科目を選択",
  committing: "Committing",
}

export type ExpenseInput = {
  amount: number
  paymentMethod: string
  paymentMethodId: string
  description: string
  category: string
  categoryId: string
  date: string
}

export type ExpenseInputField = keyof ExpenseInput

export type SelectLedgerAccountContext = {
  /** フィルターする勘定科目の種類。undefined の場合は全種類を表示 */
  kind?: LedgerAccountKind
  /** 選択された勘定科目を受け取るコールバック */
  onSelect: (account: { id: string; name: string }) => void
}

/**
 * command prompt を開いてからの一連のセッション情報。
 * ページ遷移履歴・入力データをまとめて管理する。
 */
export type CmdContext = {
  /** 現在表示しているページ */
  page: CmdPage
  /**
   * 戻るナビゲーション用のページ履歴。
   * 現在のページは含まず、最後の要素が一つ前のページ。
   */
  pageHistory: CmdPage[]
  /** コマンド入力欄の値 */
  inputValue: string
  /** 支出入力フォームのデータ */
  expenseInput: ExpenseInput
  /** 支出フォームのバリデーションエラーフィールド */
  expenseValidationErrors: ReadonlySet<ExpenseInputField>
  /** selectLedgerAccount ページ用のコールバック */
  selectLedgerAccountContext: SelectLedgerAccountContext | null
}

const defaultExpenseInput: ExpenseInput = {
  amount: 0,
  paymentMethod: "",
  paymentMethodId: "",
  description: "",
  category: "",
  categoryId: "",
  date: "",
}

export const defaultCmdContext: CmdContext = {
  page: "closed",
  pageHistory: [],
  inputValue: "",
  expenseInput: defaultExpenseInput,
  expenseValidationErrors: new Set<ExpenseInputField>(),
  selectLedgerAccountContext: null,
}

// ─── Single source of truth ─────────────────────────────────────────────────

/** command prompt 全体のコンテキスト（single source of truth） */
export const cmdContextAtom = atom<CmdContext>(defaultCmdContext)

// ─── 便利な派生アトム ────────────────────────────────────────────────────────

export const cmdPageAtom = atom(
  (get) => get(cmdContextAtom).page,
  (_get, set, page: CmdPage) => set(cmdContextAtom, (ctx) => ({ ...ctx, page })),
)

export const inputValueAtom = atom(
  (get) => get(cmdContextAtom).inputValue,
  (_get, set, inputValue: string) => set(cmdContextAtom, (ctx) => ({ ...ctx, inputValue })),
)

export const expenseInputAtom = atom(
  (get) => get(cmdContextAtom).expenseInput,
  (_get, set, update: Partial<ExpenseInput>) =>
    set(cmdContextAtom, (ctx) => ({
      ...ctx,
      expenseInput: { ...ctx.expenseInput, ...update },
    })),
)

export const expenseValidationErrorsAtom = atom(
  (get) => get(cmdContextAtom).expenseValidationErrors,
  (_get, set, errors: ReadonlySet<ExpenseInputField>) =>
    set(cmdContextAtom, (ctx) => ({ ...ctx, expenseValidationErrors: errors })),
)

export const selectLedgerAccountContextAtom = atom(
  (get) => get(cmdContextAtom).selectLedgerAccountContext,
  (_get, set, selectLedgerAccountContext: SelectLedgerAccountContext | null) =>
    set(cmdContextAtom, (ctx) => ({ ...ctx, selectLedgerAccountContext })),
)

// ─── ナビゲーションアトム ───────────────────────────────────────────────────

/**
 * 新しいページへ遷移する。
 * 現在のページを履歴に積んでから page を更新し、inputValue をリセットする。
 */
export const navigateAtom = atom(null, (get, set, nextPage: CmdPage) => {
  const ctx = get(cmdContextAtom)
  // "closed" は履歴に積まない
  const newHistory = ctx.page !== "closed" ? [...ctx.pageHistory, ctx.page] : ctx.pageHistory
  set(cmdContextAtom, { ...ctx, page: nextPage, pageHistory: newHistory, inputValue: "" })
})

/**
 * 一つ前のページに戻る（Cmd+B）。
 * 履歴がなければ何もしない。
 */
export const goBackAtom = atom(null, (get, set) => {
  const ctx = get(cmdContextAtom)
  if (ctx.pageHistory.length === 0) return
  const history = [...ctx.pageHistory]
  const prevPage = history.pop()
  if (prevPage === undefined) return
  set(cmdContextAtom, { ...ctx, page: prevPage, pageHistory: history, inputValue: "" })
})

// ─── キーハンドラーアトム（ページコンポーネントが登録・解除する） ──────────

/** 現在のページが登録する Enter キーハンドラー。処理した場合は true を返す。 */
export const enterHandlerAtom = atom<((value: string) => boolean) | null>(null)

/** 現在のページが登録する Cmd+Enter キーハンドラー。非同期処理に対応。 */
export const cmdEnterHandlerAtom = atom<(() => Promise<void>) | null>(null)

// ─── リセット ────────────────────────────────────────────────────────────────

/** モーダルを閉じる際に全状態をリセットする */
export const resetAtom = atom(null, (_get, set) => {
  set(cmdContextAtom, defaultCmdContext)
  set(enterHandlerAtom, null)
  set(cmdEnterHandlerAtom, null)
})
