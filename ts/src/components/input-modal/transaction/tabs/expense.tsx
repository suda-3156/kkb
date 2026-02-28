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
import { type ExpenseFormValues, expenseSchema } from "@/lib/mutation/schema"
import { todayStr } from "@/lib/timeutils"

export const ExpenseForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayStr(),
      description: "",
      amount: 0,
      paymentMethodId: "",
      categoryId: "",
    },
  })

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      console.log(values)
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.description,
            entries: [
              {
                ledgerAccountId: values.categoryId,
                amount: values.amount,
                kind: JournalEntryKind.Debit,
              },
              {
                ledgerAccountId: values.paymentMethodId,
                amount: values.amount,
                kind: JournalEntryKind.Credit,
              },
            ],
          },
        },
        refetchQueries: [
          "PeriodicExpenses",
          "RecentTransactions",
          "MonthlyExpensesSeries",
          "ExpensesProportion",
        ],
        awaitRefetchQueries: true,
      })
      toast.success("支出を記録しました")
      onSuccess()
    } catch {
      toast.error("支出の記録に失敗しました")
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
        label="費用科目"
        name="categoryId"
        kind={LedgerAccountKind.Expense}
      />
      <SelectLedgerAccountField
        form={form}
        label="支払い方法"
        name="paymentMethodId"
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
