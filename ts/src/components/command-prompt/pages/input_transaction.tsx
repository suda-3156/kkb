"use client"

import { useMutation } from "@apollo/client/react"
import { useAtom, useSetAtom } from "jotai"
import { Circle, CircleCheck, CircleX, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { graphql } from "@/graph"
import { JournalEntryKind } from "@/graph/graphql"
import {
  type CmdPage,
  cmdEnterHandlerAtom,
  defaultJournalEntryDraft,
  editingEntryIndexAtom,
  enterHandlerAtom,
  inputValueAtom,
  navigateAtom,
  pageLabels,
  resetAtom,
  transactionInputAtom,
  transactionValidationErrorsAtom,
} from "../state"

const CreateManualTransaction = graphql(/* GraphQL */ `
  mutation CreateManualTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
    }
  }
`)

const page: CmdPage = "inputTransaction"

export const InputTransactionCmdPage = () => {
  const [input, setInput] = useAtom(transactionInputAtom)
  const [validationErrors, setValidationErrors] = useAtom(transactionValidationErrorsAtom)
  const setEditingEntryIndex = useSetAtom(editingEntryIndexAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setCmdEnterHandler = useSetAtom(cmdEnterHandlerAtom)
  const navigate = useSetAtom(navigateAtom)
  const reset = useSetAtom(resetAtom)

  const [createTransaction] = useMutation(CreateManualTransaction)

  const editEntry = React.useCallback(
    (index: number) => {
      setEditingEntryIndex(index)
      navigate("editJournalEntry")
    },
    [setEditingEntryIndex, navigate],
  )

  const addEntry = React.useCallback(() => {
    const newEntries = [...input.entries, defaultJournalEntryDraft(JournalEntryKind.Debit)]
    setInput({ entries: newEntries })
    setEditingEntryIndex(newEntries.length - 1)
    navigate("editJournalEntry")
  }, [input.entries, setInput, setEditingEntryIndex, navigate])

  React.useEffect(() => {
    setEnterHandler(() => (value: string) => {
      if (/^\/addentry\s*$/.test(value)) {
        addEntry()
        return true
      }
      const deleteMatch = value.match(/^\/delete\s+(\d+)$/)
      if (deleteMatch) {
        const index = Number(deleteMatch[1]) - 1
        if (index >= 0 && index < input.entries.length && input.entries.length > 2) {
          setInput({ entries: input.entries.filter((_, i) => i !== index) })
          setInputValue("")
        }
        return true
      }
      const dateMatch = value.match(/^\/date\s+(.+)$/)
      if (dateMatch) {
        setInput({ date: dateMatch[1].trim() })
        setInputValue("")
        return true
      }
      const memoMatch = value.match(/^\/memo\s+(.+)$/)
      if (memoMatch) {
        setInput({ description: memoMatch[1].trim() })
        setInputValue("")
        return true
      }
      return false
    })
    return () => setEnterHandler(null)
  }, [addEntry, input.entries, setInput, setInputValue, setEnterHandler])

  React.useEffect(() => {
    setCmdEnterHandler(() => async () => {
      const fieldErrors = new Set<"date" | "description" | "balance">()
      const entryErrors = new Map<number, Set<"ledgerAccount" | "amount">>()

      if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fieldErrors.add("date")
      if (!input.description) fieldErrors.add("description")

      let debitTotal = 0
      let creditTotal = 0
      for (let i = 0; i < input.entries.length; i++) {
        const entry = input.entries[i]
        const errs = new Set<"ledgerAccount" | "amount">()
        if (!entry.ledgerAccountId) errs.add("ledgerAccount")
        if (entry.amount <= 0) errs.add("amount")
        if (errs.size > 0) entryErrors.set(i, errs)
        if (entry.kind === JournalEntryKind.Debit) {
          debitTotal += entry.amount
        } else {
          creditTotal += entry.amount
        }
      }

      if (debitTotal !== creditTotal) fieldErrors.add("balance")

      if (fieldErrors.size > 0 || entryErrors.size > 0) {
        setValidationErrors({ fields: fieldErrors, entries: entryErrors })
        return
      }

      setValidationErrors({ fields: new Set(), entries: new Map() })

      try {
        await createTransaction({
          variables: {
            input: {
              date: input.date,
              description: input.description,
              entries: input.entries.map((e) => ({
                ledgerAccountId: e.ledgerAccountId,
                amount: e.amount,
                kind: e.kind,
              })),
            },
          },
          refetchQueries: ["RecentTransactions"],
          awaitRefetchQueries: true,
        })
        toast.success("取引を記録しました")
        reset()
      } catch {
        toast.error("取引の記録に失敗しました")
        reset()
      }
    })
    return () => setCmdEnterHandler(null)
  }, [input, createTransaction, setValidationErrors, reset, setCmdEnterHandler])

  const debitTotal = input.entries
    .filter((e) => e.kind === JournalEntryKind.Debit)
    .reduce((sum, e) => sum + e.amount, 0)
  const creditTotal = input.entries
    .filter((e) => e.kind === JournalEntryKind.Credit)
    .reduce((sum, e) => sum + e.amount, 0)
  const isBalanced = debitTotal > 0 && debitTotal === creditTotal

  return (
    <>
      <CommandGroup forceMount heading={pageLabels[page]}>
        <CommandItem value="/date" onSelect={() => setInputValue("/date ")}>
          <StatusIcon done={input.date !== ""} hasError={validationErrors.fields.has("date")} />
          日付: {input.date || "—"}
          <span className="ml-auto text-muted-foreground text-xs">/date</span>
        </CommandItem>
        <CommandItem value="/memo" onSelect={() => setInputValue("/memo ")}>
          <StatusIcon
            done={input.description !== ""}
            hasError={validationErrors.fields.has("description")}
          />
          メモ: {input.description || "—"}
          <span className="ml-auto text-muted-foreground text-xs">/memo</span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup forceMount className="min-h-0 flex-1 overflow-y-auto" heading="仕訳">
        {input.entries.map((entry, i) => (
          <CommandItem
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list
            key={`entry-${i}`}
            value={`/entry-${i + 1}`}
            onSelect={() => editEntry(i)}
          >
            <EntryStatus
              hasError={
                (validationErrors.entries.get(i)?.has("ledgerAccount") ||
                  validationErrors.entries.get(i)?.has("amount")) ??
                false
              }
              done={entry.ledgerAccountId !== "" && entry.amount > 0}
            />
            <span className="w-4 shrink-0 font-mono text-muted-foreground text-xs">{i + 1}</span>
            <span
              className={
                entry.kind === JournalEntryKind.Debit
                  ? "shrink-0 text-blue-500"
                  : "shrink-0 text-red-500"
              }
            >
              {entry.kind === JournalEntryKind.Debit ? "借方" : "貸方"}
            </span>
            <span className="truncate">{entry.ledgerAccountName || "—"}</span>
            <span className="ml-auto shrink-0 text-muted-foreground text-xs">
              {entry.amount > 0 ? entry.amount.toLocaleString() : "—"}
            </span>
          </CommandItem>
        ))}
        <CommandItem value="/addentry" forceMount onSelect={addEntry}>
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          仕訳を追加
          <span className="ml-auto text-muted-foreground text-xs">/addentry</span>
        </CommandItem>
        {input.entries.length > 2 && (
          <CommandItem value="/delete" forceMount onSelect={() => setInputValue("/delete ")}>
            <Trash2 className="size-4 shrink-0 text-muted-foreground" />
            仕訳を削除
            <span className="ml-auto text-muted-foreground text-xs">/delete &lt;番号&gt;</span>
          </CommandItem>
        )}
      </CommandGroup>

      <CommandGroup forceMount className="shrink-0 border-t" heading="帳尻">
        <CommandItem disabled>
          <StatusIcon done={isBalanced} hasError={validationErrors.fields.has("balance")} />
          <span>借方: {debitTotal.toLocaleString()}</span>
          <span className="mx-1 text-muted-foreground">/</span>
          <span>貸方: {creditTotal.toLocaleString()}</span>
        </CommandItem>
      </CommandGroup>
    </>
  )
}

const StatusIcon = ({ done, hasError }: { done: boolean; hasError: boolean }) => {
  if (hasError) return <CircleX className="size-4 shrink-0 text-destructive" />
  if (done) return <CircleCheck className="size-4 shrink-0 text-green-500" />
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />
}

const EntryStatus = ({ done, hasError }: { done: boolean; hasError: boolean }) => {
  if (hasError) return <CircleX className="size-4 shrink-0 text-destructive" />
  if (done) return <CircleCheck className="size-4 shrink-0 text-green-500" />
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />
}
