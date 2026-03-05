"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSetAtom } from "jotai"
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
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { type ExpenseFormValues, expenseSchema } from "@/lib/schema"
import { todayStr } from "@/lib/timeutils"
import { closeModalAtom } from "../state"
import { Footer } from "../wrapper"

export const ExpenseForm = () => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)
  const close = useSetAtom(closeModalAtom)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayStr(),
      desc: "",
      amount: 0,
      paymentId: "",
      categoryId: "",
    },
  })

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await createTransaction({
        variables: {
          input: {
            date: values.date,
            description: values.desc,
            entries: [
              {
                ledgerAccountId: values.categoryId,
                amount: values.amount,
                kind: JournalEntryKind.Debit,
              },
              {
                ledgerAccountId: values.paymentId,
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
      toast.success("記録しました")
      close()
    } catch {
      toast.error("記録に失敗しました")
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="relative w-full space-y-4 overflow-x-hidden"
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
