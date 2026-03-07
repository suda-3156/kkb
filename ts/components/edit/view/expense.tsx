"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSetAtom } from "jotai"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import { type ExpenseFormValues, expenseSchema } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { LoadingInline } from "../../loading"
import { Button } from "../../ui/button"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { CreateTransactionDoc } from "../queries"
import { closeModalAtom } from "../state"
import { Footer } from "../wrapper"

export const ExpenseForm = () => {
  const [createTransaction, { loading }] = useMutation(CreateTransactionDoc)
  const close = useSetAtom(closeModalAtom)
  const router = useRouter()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayString(),
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
      })
      toast.success("記録しました")
      router.refresh()
      close()
    } catch {
      toast.error("記録に失敗しました")
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
