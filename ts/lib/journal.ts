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
 * Pure functions turning form values into the GraphQL transaction input.
 *
 * The simple forms (expense, revenue, transfer) fix the debit/credit direction in
 * the UI. Types cannot enforce that direction, so it is gathered here where unit
 * tests can hold it.
 */

export type TransactionDetail = NonNullable<GetTransactionForModalQuery["transaction"]>

/**
 * Build one debit and one credit line of equal amount, so the entry always balances.
 */
const entryPair = (
  debitAccountId: string,
  creditAccountId: string,
  amount: number,
): JournalEntryInput[] => [
  { ledgerAccountId: debitAccountId, amount, kind: JournalEntryKind.Debit },
  { ledgerAccountId: creditAccountId, amount, kind: JournalEntryKind.Credit },
]

/** Expense: the expense account is debited, the asset paying for it is credited. */
export const buildExpenseEntries = (values: ExpenseFormValues): JournalEntryInput[] =>
  entryPair(values.categoryId, values.paymentId, values.amount)

/** Revenue: the receiving asset is debited, the revenue account is credited. */
export const buildRevenueEntries = (values: RevenueFormValues): JournalEntryInput[] =>
  entryPair(values.depositId, values.sourceId, values.amount)

/** Transfer: the destination asset is debited, the source asset is credited. */
export const buildTransferEntries = (values: TransferFormValues): JournalEntryInput[] =>
  entryPair(values.toId, values.fromId, values.amount)

/** Detailed form: the user has already chosen the direction of every line. */
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
 * Updating needs id and updatedAt for optimistic locking. Without an already
 * fetched transaction there is nothing to update, so this is required by the type
 * rather than papered over with a fallback at the call site.
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

/** Edit mode defaults: turn a fetched transaction back into detailed form values. */
export const toTransactionFormValues = (txn: TransactionDetail): TransactionFormValues => ({
  date: txn.date,
  desc: txn.description,
  entries: txn.entries.map((e) => ({
    lacId: e.ledgerAccount.id,
    amount: e.amount,
    kind: e.kind,
  })),
})
