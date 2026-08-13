import { z } from "zod"

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください")
  .refine((str) => {
    const date = new Date(str)
    return !Number.isNaN(date.getTime())
  }, "有効な日付を入力してください")

const amountSchema = z
  .number()
  .int("整数を入力してください")
  .positive("0 より大きい値を入力してください")

export const expenseSchema = z.object({
  date: dateSchema,
  desc: z.string().min(1, "説明は必須です").max(300, "説明は300文字以下です"),
  amount: amountSchema,
  paymentId: z.string().min(1, "支払い方法を選択してください"),
  categoryId: z.string().min(1, "費用科目を選択してください"),
})

export const revenueSchema = z.object({
  date: dateSchema,
  desc: z.string().min(1, "説明は必須です").max(300, "説明は300文字以下です"),
  amount: amountSchema,
  depositId: z.string().min(1, "入金先口座を選択してください"),
  sourceId: z.string().min(1, "収入科目を選択してください"),
})

export const transferSchema = z.object({
  date: dateSchema,
  desc: z.string().min(1, "説明は必須です").max(300, "説明は300文字以下です"),
  amount: amountSchema,
  fromId: z.string().min(1, "振替元口座を選択してください"),
  toId: z.string().min(1, "振替先口座を選択してください"),
})

export const journalEntrySchema = z.object({
  lacId: z.string().min(1, "勘定科目を選択してください"),
  amount: amountSchema,
  kind: z.enum(["DEBIT", "CREDIT"]),
})

export const transactionSchema = z
  .object({
    date: dateSchema,
    desc: z.string().min(1, "説明は必須です").max(300, "説明は300文字以下です"),
    entries: z.array(journalEntrySchema).min(2, "仕訳は 2 行以上必要です"),
  })
  .superRefine((data, ctx) => {
    const debitTotal = data.entries
      .filter((e) => e.kind === "DEBIT")
      .reduce((sum, e) => sum + e.amount, 0)
    const creditTotal = data.entries
      .filter((e) => e.kind === "CREDIT")
      .reduce((sum, e) => sum + e.amount, 0)
    if (debitTotal !== creditTotal || debitTotal === 0) {
      ctx.addIssue({
        code: "custom",
        message: "借方合計と貸方合計が一致しません",
        path: ["entries"],
      })
    }
  })

export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type RevenueFormValues = z.infer<typeof revenueSchema>
export type TransferFormValues = z.infer<typeof transferSchema>
export type TransactionFormValues = z.infer<typeof transactionSchema>

export const subscriptionColorSchema = z.enum([
  "RED",
  "ORANGE",
  "AMBER",
  "LIME",
  "EMERALD",
  "TEAL",
  "SKY",
  "BLUE",
  "VIOLET",
  "FUCHSIA",
  "PINK",
  "ROSE",
])

export const subscriptionSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(200, "名前は200文字以下です"),
  registeredOn: dateSchema,
  intervalMonths: z
    .number()
    .int("整数を入力してください")
    .min(1, "周期は 1 か月以上です")
    .max(12, "周期は 12 か月以下です"),
  // null = automatic (derived from the ID on display)
  color: subscriptionColorSchema.nullable(),
  amount: amountSchema,
  categoryId: z.string().min(1, "費用科目を選択してください"),
  paymentId: z.string().min(1, "支払い方法を選択してください"),
})

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

export const ledgerAccountSchema = z.object({
  parentId: z.string().optional(),
  name: z.string().min(1, "勘定科目名は必須です").max(100, "勘定科目名は100文字以下です"),
  isGroup: z.boolean(),
})

export type LedgerAccountFormValues = z.infer<typeof ledgerAccountSchema>
