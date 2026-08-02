"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { LedgerAccountKind } from "@/graph/graphql"
import { buildExpenseInput } from "@/lib/journal"
import { type ExpenseFormValues, expenseSchema } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { LoadingInline } from "../../loading"
import { Button } from "../../ui/button"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { useTransaction } from "../use-transaction"
import { Footer } from "../wrapper"

export const ExpenseForm = () => {
  const { create, loading } = useTransaction()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayString(),
      desc: "",
      amount: Number.NaN,
      paymentId: "",
      categoryId: "",
    },
  })

  const onSubmit = (values: ExpenseFormValues) =>
    create(buildExpenseInput(values), { success: "記録しました", error: "記録に失敗しました" })

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="relative w-full space-y-4 overflow-hidden px-3"
    >
      <div className="grid grid-cols-2 gap-4">
        <DateField name="date" form={form} />
        <AmountField name="amount" form={form} />
      </div>

      <TextField
        name="desc"
        form={form}
        label="メモ"
        required
        maxLength={300}
        placeholder="メモを入力"
      />

      <SelectLedgerAccountField
        form={form}
        label="費用科目"
        name="categoryId"
        kind={LedgerAccountKind.Expense}
      />

      <SelectLedgerAccountField
        form={form}
        label="支払い方法"
        name="paymentId"
        kind={LedgerAccountKind.Asset}
      />

      <Footer>
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </Footer>
    </form>
  )
}
