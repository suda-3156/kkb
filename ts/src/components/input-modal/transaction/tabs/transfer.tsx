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
import { type TransferFormValues, transferSchema } from "@/lib/mutation/schema"
import { todayStr } from "@/lib/timeutils"

export const TransferForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: todayStr(),
      description: "",
      amount: 0,
      fromAccountId: "",
      toAccountId: "",
    },
  })

  const onSubmit = async (values: TransferFormValues) => {
    try {
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.description,
            entries: [
              {
                ledgerAccountId: values.toAccountId,
                amount: values.amount,
                kind: JournalEntryKind.Debit,
              },
              {
                ledgerAccountId: values.fromAccountId,
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
      onSuccess()
    } catch {
      toast.error("振替の記録に失敗しました")
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
        label="説明"
        required
        maxLength={300}
        placeholder="説明を入力"
      />

      <SelectLedgerAccountField
        form={form}
        label="振替元口座"
        name="fromAccountId"
        kind={LedgerAccountKind.Asset}
      />

      <SelectLedgerAccountField
        form={form}
        label="振替先口座"
        name="toAccountId"
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
