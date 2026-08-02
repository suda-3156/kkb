"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { LedgerAccountKind } from "@/graph/graphql"
import { buildTransferInput } from "@/lib/journal"
import { type TransferFormValues, transferSchema } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { useTransaction } from "../use-transaction"
import { Footer } from "../wrapper"

export const TransferForm = () => {
  const { create, loading } = useTransaction()

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: todayString(),
      desc: "",
      amount: Number.NaN,
      fromId: "",
      toId: "",
    },
  })

  const onSubmit = (values: TransferFormValues) =>
    create(buildTransferInput(values), {
      success: "振替を記録しました",
      error: "振替の記録に失敗しました",
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

      <SelectLedgerAccountField
        form={form}
        label="振替元口座"
        name="fromId"
        kind={LedgerAccountKind.Asset}
      />

      <SelectLedgerAccountField
        form={form}
        label="振替先口座"
        name="toId"
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
