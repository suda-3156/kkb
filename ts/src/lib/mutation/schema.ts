import { z } from "zod"
import { JournalEntryKind } from "@/graph/graphql"

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください")

const amountSchema = z
  .number()
  .int("整数を入力してください")
  .positive("0 より大きい値を入力してください")

export const expenseSchema = z.object({
  date: dateSchema,
  description: z.string().min(1, "説明は必須です"),
  amount: amountSchema,
  paymentMethodId: z.string().min(1, "支払い方法を選択してください"),
  categoryId: z.string().min(1, "費用科目を選択してください"),
})

export const revenueSchema = z.object({
  date: dateSchema,
  description: z.string().min(1, "説明は必須です"),
  amount: amountSchema,
  depositAccountId: z.string().min(1, "入金先口座を選択してください"),
  sourceId: z.string().min(1, "収入科目を選択してください"),
})

export const transferSchema = z.object({
  date: dateSchema,
  description: z.string().min(1, "説明は必須です"),
  amount: amountSchema,
  fromAccountId: z.string().min(1, "振替元口座を選択してください"),
  toAccountId: z.string().min(1, "振替先口座を選択してください"),
})

export const journalEntrySchema = z.object({
  ledgerAccountId: z.string().min(1, "勘定科目を選択してください"),
  amount: amountSchema,
  kind: z.enum([JournalEntryKind.Debit, JournalEntryKind.Credit]),
})

export const transactionSchema = z
  .object({
    date: dateSchema,
    description: z.string().min(1, "説明は必須です"),
    entries: z.array(journalEntrySchema).min(2, "仕訳は 2 行以上必要です"),
  })
  .superRefine((data, ctx) => {
    const debitTotal = data.entries
      .filter((e) => e.kind === JournalEntryKind.Debit)
      .reduce((sum, e) => sum + e.amount, 0)
    const creditTotal = data.entries
      .filter((e) => e.kind === JournalEntryKind.Credit)
      .reduce((sum, e) => sum + e.amount, 0)
    if (debitTotal !== creditTotal || debitTotal === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "借方合計と貸方合計が一致しません",
        path: ["entries"],
      })
    }
  })

export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type RevenueFormValues = z.infer<typeof revenueSchema>
export type TransferFormValues = z.infer<typeof transferSchema>
export type TransactionFormValues = z.infer<typeof transactionSchema>
