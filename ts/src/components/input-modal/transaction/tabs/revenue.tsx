"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  AmountField,
  DateField,
  SelectLedgerAccountField,
  TextField,
} from "@/components/input-modal/fields"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { CreateTransactionDoc } from "@/lib/mutation/query"
import { type RevenueFormValues, revenueSchema } from "@/lib/mutation/schema"
import { todayStr } from "@/lib/timeutils"

export const RevenueForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)

  const form = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueSchema),
    defaultValues: {
      date: todayStr(),
      description: "",
      amount: 0,
      depositAccountId: "",
      sourceId: "",
    },
  })

  const onSubmit = async (values: RevenueFormValues) => {
    try {
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.description,
            entries: [
              {
                ledgerAccountId: values.depositAccountId,
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
      onSuccess()
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
        name="description"
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
        name="depositAccountId"
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
