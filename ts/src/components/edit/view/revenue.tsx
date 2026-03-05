"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSetAtom } from "jotai/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  AmountField,
  DateField,
  SelectLedgerAccountField,
  TextField,
} from "@/components/edit/fields"
import { CreateTransactionDoc } from "@/components/edit/query"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { type RevenueFormValues, revenueSchema } from "@/lib/schema"
import { todayStr } from "@/lib/timeutils"
import { closeModalAtom } from "../state"

export const RevenueForm = () => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)
  const close = useSetAtom(closeModalAtom)

  const form = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      date: todayStr(),
      desc: "",
      amount: 0,
      depositId: "",
      sourceId: "",
    },
  })

  const onSubmit = async (values: RevenueFormValues) => {
    try {
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.desc,
            entries: [
              {
                ledgerAccountId: values.depositId,
                amount: values.amount,
                kind: JournalEntryKind.Debit,
              },
              {
                ledgerAccountId: values.sourceId,
                amount: values.amount,
                kind: JournalEntryKind.Credit,
              },
            ],
          },
        },
        refetchQueries: ["RecentTransactions"],
        awaitRefetchQueries: true,
      })
      toast.success("収入を記録しました")
      close()
    } catch {
      toast.error("収入の記録に失敗しました")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        label="収入科目"
        name="sourceId"
        kind={LedgerAccountKind.Revenue}
      />

      <SelectLedgerAccountField
        form={form}
        label="入金先口座"
        name="depositId"
        kind={LedgerAccountKind.Asset}
      />

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </DialogFooter>
    </form>
  )
}
