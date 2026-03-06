"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSetAtom } from "jotai/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { type TransferFormValues, transferSchema } from "@/lib/schema"
import { todayStr } from "@/lib/timeutils"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { CreateTransactionDoc } from "../query"
import { closeModalAtom } from "../state"
import { Footer } from "../wrapper"

export const TransferForm = () => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)
  const close = useSetAtom(closeModalAtom)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: todayStr(),
      desc: "",
      amount: 0,
      fromId: "",
      toId: "",
    },
  })

  const onSubmit = async (values: TransferFormValues) => {
    try {
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.desc,
            entries: [
              {
                ledgerAccountId: values.toId,
                amount: values.amount,
                kind: JournalEntryKind.Debit,
              },
              {
                ledgerAccountId: values.fromId,
                amount: values.amount,
                kind: JournalEntryKind.Credit,
              },
            ],
          },
        },
        refetchQueries: ["RecentTransactions"],
        awaitRefetchQueries: true,
      })
      toast.success("振替を記録しました")
      close()
    } catch {
      toast.error("振替の記録に失敗しました")
    }
  }

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
