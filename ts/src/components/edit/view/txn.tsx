"use client"

import { useMutation } from "@apollo/client/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSetAtom } from "jotai/react"
import { Plus, Trash2 } from "lucide-react"
import { useEffect } from "react"
import { type UseFieldArrayRemove, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  AmountField,
  DateField,
  SelectLedgerAccountField,
  TextField,
} from "@/components/edit/fields"
import { CreateTransactionDoc, UpdateTransactionDoc } from "@/components/edit/query"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { type GetTransactionForModalQuery, JournalEntryKind } from "@/graph/graphql"
import { type TransactionFormValues, transactionSchema } from "@/lib/schema"
import { todayStr } from "@/lib/timeutils"
import { cn } from "@/lib/utils"
import { closeModalAtom } from "../state"
import { Footer } from "../wrapper"

export const TransactionForm = ({ data }: { data?: GetTransactionForModalQuery }) => {
  const [createTransaction, { loading: creating }] = useMutation(CreateTransactionDoc)
  const [updateTransaction, { loading: updating }] = useMutation(UpdateTransactionDoc)
  const loading = creating || updating
  const close = useSetAtom(closeModalAtom)

  const updateMode = Boolean(data?.transaction)

  useEffect(() => {
    if (data?.transaction) {
      const txn = data.transaction
      form.reset({
        date: txn.date,
        desc: txn.description,
        entries: txn.entries.map((e) => ({
          lacId: e.ledgerAccount.id,
          amount: e.amount,
          kind: e.kind,
        })),
      })
    }
  })

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: todayStr(),
      desc: "",
      entries: [
        { lacId: "", amount: 0, kind: JournalEntryKind.Debit },
        { lacId: "", amount: 0, kind: JournalEntryKind.Credit },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  })

  const save = async (values: TransactionFormValues) => {
    if (updateMode) {
      await updateTransaction({
        variables: {
          input: {
            id: data?.transaction?.id ?? "",
            date: values.date,
            description: values.desc,
            entries: values.entries.map((e) => ({
              ledgerAccountId: e.lacId,
              amount: e.amount,
              kind: e.kind,
            })),
            updatedAt: data?.transaction?.updatedAt ?? "",
          },
        },
        refetchQueries: ["RecentTransactions"],
        awaitRefetchQueries: true,
      })
      toast.success("更新しました")
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
      toast.success("記録しました")
    }
  }

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      await save(values)
      close()
    } catch {
      toast.error("記録に失敗しました")
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="relative w-full space-y-4 overflow-hidden"
    >
      <div className="grid grid-cols-2 gap-4">
        <DateField name="date" form={form} />
        <TextField
          name="desc"
          form={form}
          label="メモ"
          required
          maxLength={300}
          placeholder="メモを入力"
        />
      </div>

      <Separator />

      {/* Journal Entries */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">仕訳</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ lacId: "", amount: 0, kind: JournalEntryKind.Debit })}
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

      <Footer>
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : "確定"}
        </Button>
      </Footer>
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
        name={`entries.${index}.ledgerAccountId`}
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
    form.setValue(
      `entries.${index}.kind`,
      kind === JournalEntryKind.Debit ? JournalEntryKind.Credit : JournalEntryKind.Debit,
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      onClick={toggleKind}
      className={cn(kind === JournalEntryKind.Debit ? "bg-red-100" : "bg-blue-100")}
    >
      {" "}
      {kind === JournalEntryKind.Debit ? "借方" : "貸方"}
    </Button>
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
