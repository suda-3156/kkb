"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/ui/responsive-dialog"
import { buildRevenueInput } from "@/lib/journal"
import { type RevenueFormValues, revenueSchema } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { useTransaction } from "../use-transaction"

export const RevenueForm = () => {
  const { create, loading } = useTransaction()

  const form = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      date: todayString(),
      desc: "",
      amount: Number.NaN,
      depositId: "",
      sourceId: "",
    },
  })

  const onSubmit = (values: RevenueFormValues) =>
    create(buildRevenueInput(values), {
      success: "収入を記録しました",
      error: "収入の記録に失敗しました",
    })

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

      <SelectLedgerAccountField form={form} label="収入科目" name="sourceId" kind={"REVENUE"} />

      <SelectLedgerAccountField form={form} label="入金先口座" name="depositId" kind={"ASSET"} />

      <Footer>
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </Footer>
    </form>
  )
}
