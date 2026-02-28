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

export const cmdPageAtom = atom<CmdPage>("closed")

export const inputValueAtom = atom<string>("")

/**
 * 現在表示中のページが登録する Enter キーハンドラー。
 * 値を受け取り、処理した場合は true を返す。
 */
export const enterHandlerAtom = atom<((value: string) => boolean) | null>(null)

/**
 * 現在表示中のページが登録する Cmd+Enter キーハンドラー。
 * 非同期処理（バリデーション・ミューテーション等）に対応。
 */
export const cmdEnterHandlerAtom = atom<(() => Promise<void>) | null>(null)

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

/** バリデーションエラーがあるフィールドのセット */
export const expenseValidationErrorsAtom = atom<ReadonlySet<ExpenseInputField>>(
  new Set<ExpenseInputField>(),
)

const expenseInputData = atom<ExpenseInput>({
  amount: 0,
  paymentMethod: "",
  paymentMethodId: "",
  description: "",
  category: "",
  categoryId: "",
  date: "",
})

export const expenseInputAtom = atom(
  (get) => get(expenseInputData),
  (get, set, update: Partial<ExpenseInput>) => {
    const current = get(expenseInputData)
    set(expenseInputData, { ...current, ...update })
  },
)

export type SelectLedgerAccountContext = {
  /** フィルターする勘定科目の種類。undefined の場合は全種類を表示 */
  kind?: LedgerAccountKind
  /** 選択後に戻るページ */
  returnPage: CmdPage
  /** 選択された勘定科目を受け取るコールバック */
  onSelect: (account: { id: string; name: string }) => void
}

export const selectLedgerAccountContextAtom = atom<SelectLedgerAccountContext | null>(null)

// When closing the command modal, reset all states to initial values
export const resetAtom = atom(null, (_, set) => {
  set(cmdPageAtom, "closed")
  set(inputValueAtom, "")
  set(selectLedgerAccountContextAtom, null)
  set(cmdEnterHandlerAtom, null)
  set(expenseValidationErrorsAtom, new Set<ExpenseInputField>())
  set(expenseInputAtom, {
    amount: 0,
    paymentMethod: "",
    paymentMethodId: "",
    description: "",
    category: "",
    categoryId: "",
    date: "",
  })
})
