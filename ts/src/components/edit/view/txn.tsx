"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import React from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { DebitCreditToggle } from "@/components/debit-credit-toggle"
import {
  AmountField,
  DateField,
  SelectLedgerAccountField,
  TextField,
} from "@/components/edit/fields"
import { CreateTransactionDoc, UpdateTransactionDoc } from "@/components/edit/query"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { JournalEntryKind } from "@/graph/graphql"
import { type TransactionFormValues, transactionSchema } from "@/lib/schema"
import { todayStr } from "@/lib/timeutils"
import { Footer } from "../wrapper"

interface TransactionInitialData {
  id: string
  date: string
  description: string
  updatedAt: string
  entries: Array<{
    ledgerAccount: { id: string; name: string }
    amount: number
    kind: JournalEntryKind
  }>
}

type Props = {
  onSuccess: () => void
  initialData?: TransactionInitialData
}

const defaultEntry = (kind: JournalEntryKind): TransactionFormValues["entries"][number] => ({
  lacId: "",
  amount: 0,
  kind,
})

export const TransactionForm = ({ onSuccess, initialData }: Props) => {
  const isEdit = !!initialData
  const [createTransaction, { loading: creating }] = useMutation(CreateTransactionDoc)
  const [updateTransaction, { loading: updating }] = useMutation(UpdateTransactionDoc)
  const loading = creating || updating

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: todayStr(),
      desc: "",
      entries: [defaultEntry(JournalEntryKind.Debit), defaultEntry(JournalEntryKind.Credit)],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  })

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date,
        desc: initialData.description,
        entries: initialData.entries.map((e) => ({
          ledgerAccountId: e.ledgerAccount.id,
          ledgerAccountName: e.ledgerAccount.name,
          amount: e.amount,
          kind: e.kind,
        })),
      })
    }
  }, [initialData, form.reset])

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      if (isEdit && initialData) {
        await updateTransaction({
          variables: {
            input: {
              id: initialData.id,
              date: values.date,
              description: values.desc,
              entries: values.entries.map((e) => ({
                ledgerAccountId: e.lacId,
                amount: e.amount,
                kind: e.kind,
              })),
              updatedAt: initialData.updatedAt,
            },
          },
          refetchQueries: ["RecentTransactions", "GetTransactionForModal"],
          awaitRefetchQueries: true,
        })
        toast.success("取引を更新しました")
      } else {
        await createTransaction({
          variables: {
            input: {
              date: values.date,
              description: values.desc,
              entries: values.entries.map((e) => ({
                ledgerAccountId: e.lacId,
                amount: e.amount,
                kind: e.kind,
              })),
            },
          },
          refetchQueries: ["RecentTransactions"],
          awaitRefetchQueries: true,
        })
        toast.success("取引を記録しました")
      }
      onSuccess()
    } catch {
      toast.error(isEdit ? "取引の更新に失敗しました" : "取引の記録に失敗しました")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DateField name="date" form={form} />
        <TextField
          name="desc"
          form={form}
          label="説明"
          required
          maxLength={300}
          placeholder="説明を入力"
        />
      </div>

      <Separator />

      {/* Journal Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">仕訳</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultEntry(JournalEntryKind.Debit))}
          >
            <Plus className="mr-1 size-3.5" />
            行を追加
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1.25rem_1fr_7rem_5rem_2rem] items-start gap-2 rounded-lg border px-3 py-2"
            >
              <span className="mt-7 font-mono text-muted-foreground text-xs">{index + 1}</span>

              <SelectLedgerAccountField
                name={`entries.${index}.ledgerAccountId`}
                form={form}
                label="勘定科目"
                kind={undefined} // All kinds of accounts should be selectable, so kind is not specified
              />
              <AmountField name={`entries.${index}.amount`} form={form} disabled={false} />
              <DebitCreditSelect form={form} index={index} />
              <DeleteButton fieldsLength={fields.length} onClick={() => remove(index)} />
            </div>
          ))}
        </div>

        <Summary form={form} />
      </div>

      <Footer>
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </Footer>
    </form>
  )
}

const DeleteButton = ({ fieldsLength, onClick }: { fieldsLength: number; onClick: () => void }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="mt-6 size-8 shrink-0 text-destructive"
      disabled={fieldsLength <= 2}
      onClick={onClick}
    >
      <Trash2 className="size-4 text-muted-foreground" />
    </Button>
  )
}

const DebitCreditSelect = ({
  form,
  index,
}: {
  form: ReturnType<typeof useForm<TransactionFormValues>>
  index: number
}) => {
  return (
    <div className="flex h-full w-full items-end justify-center">
      <Controller
        control={form.control}
        name={`entries.${index}.kind`}
        render={({ field: f }) => (
          <DebitCreditToggle
            value={f.value.toLocaleLowerCase() as "debit" | "credit"}
            onValueChange={(val) => f.onChange(val)}
            size="sm"
            className="translate-y-px"
          />
        )}
      />
    </div>
  )
}

const Summary = ({ form }: { form: ReturnType<typeof useForm<TransactionFormValues>> }) => {
  // 借方・貸方合計
  const watchedEntries = form.watch("entries")
  const debitTotal = watchedEntries
    .filter((e) => e.kind === JournalEntryKind.Debit)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const creditTotal = watchedEntries
    .filter((e) => e.kind === JournalEntryKind.Credit)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const isBalanced = debitTotal > 0 && debitTotal === creditTotal

  // root level error of entries
  const entriesRootError =
    form.formState.errors.entries?.root?.message ??
    (typeof form.formState.errors.entries?.message === "string"
      ? form.formState.errors.entries.message
      : undefined)

  return (
    <>
      <div className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className={isBalanced ? "text-green-600" : "text-foreground"}>
          借方: {debitTotal.toLocaleString()}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className={isBalanced ? "text-green-600" : "text-foreground"}>
          貸方: {creditTotal.toLocaleString()}
        </span>
        {debitTotal > 0 && !isBalanced && (
          <span className="ml-auto text-destructive text-xs">借方・貸方が一致していません</span>
        )}
        {isBalanced && <span className="ml-auto text-green-600 text-xs">一致</span>}
      </div>

      {entriesRootError && <p className="text-destructive text-sm">{entriesRootError}</p>}
    </>
  )
}
