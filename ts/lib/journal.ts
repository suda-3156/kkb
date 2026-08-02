import {
  type CreateTransactionInput,
  type GetTransactionForModalQuery,
  type JournalEntryInput,
  JournalEntryKind,
  type UpdateTransactionInput,
} from "@/graph/graphql"
import type {
  ExpenseFormValues,
  RevenueFormValues,
  TransactionFormValues,
  TransferFormValues,
} from "@/lib/schema"

/**
 * フォームの入力値を GraphQL の取引 input に変換する純粋関数群。
 *
 * 簡易フォーム(費用・収入・振替)は借方/貸方の向きを UI 側で固定しているが、
 * その向きは型では守れないため、ここに集約して単体テストの対象にする。
 */

export type TransactionDetail = NonNullable<GetTransactionForModalQuery["transaction"]>

/**
 * 同額の借方 1 行・貸方 1 行を組む。金額が同じなので貸借は必ず一致する。
 */
const entryPair = (
  debitAccountId: string,
  creditAccountId: string,
  amount: number,
): JournalEntryInput[] => [
  { ledgerAccountId: debitAccountId, amount, kind: JournalEntryKind.Debit },
  { ledgerAccountId: creditAccountId, amount, kind: JournalEntryKind.Credit },
]

/** 費用: 費用科目を借方、支払い方法(資産)を貸方に置く。 */
export const buildExpenseEntries = (values: ExpenseFormValues): JournalEntryInput[] =>
  entryPair(values.categoryId, values.paymentId, values.amount)

/** 収入: 入金先(資産)を借方、収入科目を貸方に置く。 */
export const buildRevenueEntries = (values: RevenueFormValues): JournalEntryInput[] =>
  entryPair(values.depositId, values.sourceId, values.amount)

/** 振替: 振替先(資産)を借方、振替元(資産)を貸方に置く。 */
export const buildTransferEntries = (values: TransferFormValues): JournalEntryInput[] =>
  entryPair(values.toId, values.fromId, values.amount)

/** 詳細フォーム: 借方/貸方の向きはユーザーが行ごとに指定済み。 */
export const buildTransactionEntries = (values: TransactionFormValues): JournalEntryInput[] =>
  values.entries.map((e) => ({
    ledgerAccountId: e.lacId,
    amount: e.amount,
    kind: e.kind,
  }))

export const buildExpenseInput = (values: ExpenseFormValues): CreateTransactionInput => ({
  date: values.date,
  description: values.desc,
  entries: buildExpenseEntries(values),
})

export const buildRevenueInput = (values: RevenueFormValues): CreateTransactionInput => ({
  date: values.date,
  description: values.desc,
  entries: buildRevenueEntries(values),
})

export const buildTransferInput = (values: TransferFormValues): CreateTransactionInput => ({
  date: values.date,
  description: values.desc,
  entries: buildTransferEntries(values),
})

export const buildCreateTransactionInput = (
  values: TransactionFormValues,
): CreateTransactionInput => ({
  date: values.date,
  description: values.desc,
  entries: buildTransactionEntries(values),
})

/**
 * 更新は楽観的ロックのため id と updatedAt を必要とする。
 * 取得済みの取引が無ければ更新できないので、呼び出し側でフォールバックせず
 * ここで型として要求する。
 */
export const buildUpdateTransactionInput = (
  values: TransactionFormValues,
  target: Pick<TransactionDetail, "id" | "updatedAt">,
): UpdateTransactionInput => ({
  id: target.id,
  date: values.date,
  description: values.desc,
  entries: buildTransactionEntries(values),
  updatedAt: target.updatedAt,
})

/** 編集モードの初期値: 取得した取引を詳細フォームの値に戻す(build* の逆変換)。 */
export const toTransactionFormValues = (txn: TransactionDetail): TransactionFormValues => ({
  date: txn.date,
  desc: txn.description,
  entries: txn.entries.map((e) => ({
    lacId: e.ledgerAccount.id,
    amount: e.amount,
    kind: e.kind,
  })),
})
