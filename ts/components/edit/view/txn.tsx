"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { type UseFieldArrayRemove, useFieldArray, useForm } from "react-hook-form"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Footer } from "@/components/ui/responsive-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { GetTransactionForModalQuery } from "@/graph/graphql"
import {
  buildCreateTransactionInput,
  buildUpdateTransactionInput,
  toTransactionFormValues,
} from "@/lib/journal"
import { type TransactionFormValues, transactionSchema } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { cn } from "@/lib/utils"
import { AmountField, DateField, SelectLedgerAccountField, TextField } from "../fields"
import { useTransaction } from "../use-transaction"

export const TransactionForm = ({ data }: { data?: GetTransactionForModalQuery }) => {
  // Renamed because remove collides with useFieldArray's line removal
  const { create, update, remove: removeTransaction, loading } = useTransaction()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // A fetched transaction means edit mode
  const txn = data?.transaction

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: todayString(),
      desc: "",
      entries: [
        { lacId: "", amount: Number.NaN, kind: "DEBIT" },
        { lacId: "", amount: Number.NaN, kind: "CREDIT" },
      ],
    },
  })

  useEffect(() => {
    if (txn) {
      form.reset(toTransactionFormValues(txn))
    }
  }, [txn, form.reset])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  })

  const onSubmit = (values: TransactionFormValues) =>
    txn
      ? update(buildUpdateTransactionInput(values, txn), {
          success: "更新しました",
          error: "記録に失敗しました",
        })
      : create(buildCreateTransactionInput(values), {
          success: "記録しました",
          error: "記録に失敗しました",
        })

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="relative w-full space-y-4 overflow-hidden px-3"
    >
      <div className="grid grid-cols-2 gap-4">
        <DateField name="date" form={form} />
        <TextField name="desc" form={form} label="メモ" maxLength={300} placeholder="メモを入力" />
      </div>

      <Separator />

      {/* Journal Entries */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">仕訳</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ lacId: "", amount: Number.NaN, kind: "DEBIT" })}
        >
          <Plus className="mr-1 size-3.5" />
          行を追加
        </Button>
      </div>

      <ScrollArea className="max-h-[20vh] space-y-2 overflow-y-auto">
        {fields.map((field, index) => (
          <Entry
            key={field.id}
            index={index}
            fieldsLen={fields.length}
            remove={remove}
            form={form}
          />
        ))}
      </ScrollArea>

      <Separator />

      <Summary form={form} />

      <Footer className={cn(txn && "sm:justify-between")}>
        {txn && (
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 />
            削除
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </Footer>

      {txn && (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title="この取引を削除しますか?"
          description={`${txn.date} ${txn.description} — 削除すると元に戻せません。`}
          confirmLabel="削除する"
          destructive
          loading={loading}
          onConfirm={() => {
            setConfirmingDelete(false)
            removeTransaction(txn.id, { success: "削除しました", error: "削除に失敗しました" })
          }}
        />
      )}
    </form>
  )
}

type Props = {
  index: number
  fieldsLen: number
  remove: UseFieldArrayRemove
  form: ReturnType<typeof useForm<TransactionFormValues>>
}

const Entry = ({ index, fieldsLen, remove, form }: Props) => {
  return (
    <div className="grid grid-cols-[1rem_1fr_7rem_5rem_2rem] items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50">
      <span className="font-mono text-muted-foreground text-xs">{index + 1}</span>
      <SelectLedgerAccountField
        name={`entries.${index}.lacId`}
        form={form}
        label={undefined} // Hide label
        kind={undefined} // All kinds of accounts should be selectable, so kind is not specified
      />
      <AmountField name={`entries.${index}.amount`} form={form} disabled={false} hideLabel />
      <DebitCreditToggle index={index} form={form} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 shrink-0",
          fieldsLen <= 2
            ? "text-muted-foreground"
            : "text-destructive hover:bg-destructive/10 hover:text-destructive",
        )}
        disabled={fieldsLen <= 2}
        onClick={() => remove(index)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

const DebitCreditToggle = ({
  index,
  form,
}: {
  index: number
  form: ReturnType<typeof useForm<TransactionFormValues>>
}) => {
  const kind = form.watch(`entries.${index}.kind`)

  const toggleKind = () => {
    form.setValue(`entries.${index}.kind`, kind === "DEBIT" ? "CREDIT" : "DEBIT")
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={toggleKind}
      className={cn(kind === "DEBIT" ? "bg-red-100" : "bg-blue-100")}
    >
      {" "}
      {kind === "DEBIT" ? "借方" : "貸方"}
    </Button>
  )
}

const Summary = ({ form }: { form: ReturnType<typeof useForm<TransactionFormValues>> }) => {
  // Debit and credit totals
  const watchedEntries = form.watch("entries")
  const debitTotal = watchedEntries
    .filter((e) => e.kind === "DEBIT")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const creditTotal = watchedEntries
    .filter((e) => e.kind === "CREDIT")
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
