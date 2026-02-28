"use client"

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Circle, CircleCheck, CircleX } from "lucide-react"
import * as React from "react"
import { CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { JournalEntryKind } from "@/graph/graphql"
import {
  cmdEnterHandlerAtom,
  editingEntryIndexAtom,
  enterHandlerAtom,
  inputValueAtom,
  navigateAtom,
  pageLabels,
  selectLedgerAccountContextAtom,
  transactionInputAtom,
  transactionValidationErrorsAtom,
} from "../state"

export const EditJournalEntryCmdPage = () => {
  const [transactionInput, setTransactionInput] = useAtom(transactionInputAtom)
  const [validationErrors] = useAtom(transactionValidationErrorsAtom)
  const editingEntryIndex = useAtomValue(editingEntryIndexAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setCmdEnterHandler = useSetAtom(cmdEnterHandlerAtom)
  const navigate = useSetAtom(navigateAtom)
  const setSelectContext = useSetAtom(selectLedgerAccountContextAtom)

  const entry = transactionInput.entries[editingEntryIndex]
  const entryErrors = validationErrors.entries.get(editingEntryIndex)

  const updateEntry = React.useCallback(
    (update: Partial<(typeof transactionInput.entries)[number]>) => {
      const newEntries = [...transactionInput.entries]
      newEntries[editingEntryIndex] = { ...newEntries[editingEntryIndex], ...update }
      setTransactionInput({ entries: newEntries })
    },
    [transactionInput.entries, editingEntryIndex, setTransactionInput],
  )

  const goToSelectAccount = React.useCallback(() => {
    setSelectContext({
      onSelect: (account) => {
        updateEntry({ ledgerAccountId: account.id, ledgerAccountName: account.name })
      },
    })
    navigate("selectLedgerAccount")
  }, [setSelectContext, navigate, updateEntry])

  React.useEffect(() => {
    setEnterHandler(() => (value: string) => {
      if (/^\/account\s*$/.test(value)) {
        goToSelectAccount()
        return true
      }
      const amountMatch = value.match(/^\/amount\s+(\d+(?:\.\d+)?)?$/)
      if (amountMatch) {
        updateEntry({ amount: Number(amountMatch[1] ?? 0) })
        setInputValue("")
        return true
      }
      if (/^\/debit\s*$/.test(value)) {
        updateEntry({ kind: JournalEntryKind.Debit })
        setInputValue("")
        return true
      }
      if (/^\/credit\s*$/.test(value)) {
        updateEntry({ kind: JournalEntryKind.Credit })
        setInputValue("")
        return true
      }
      return false
    })
    return () => setEnterHandler(null)
  }, [goToSelectAccount, updateEntry, setInputValue, setEnterHandler])

  // Cmd+Enter is not handled here — users press Cmd+B to go back to inputTransaction to submit
  React.useEffect(() => {
    setCmdEnterHandler(null)
    return () => setCmdEnterHandler(null)
  }, [setCmdEnterHandler])

  if (!entry) return <CommandEmpty>Entry not found.</CommandEmpty>

  const heading = `${pageLabels.editJournalEntry} #${editingEntryIndex + 1}`

  return (
    <CommandGroup forceMount heading={heading}>
      <CommandItem value="/account" onSelect={goToSelectAccount}>
        <StatusIcon
          done={entry.ledgerAccountId !== ""}
          hasError={entryErrors?.has("ledgerAccount") ?? false}
        />
        勘定科目: {entry.ledgerAccountName || "—"}
        <span className="ml-auto text-muted-foreground text-xs">/account</span>
      </CommandItem>
      <CommandItem value="/amount" onSelect={() => setInputValue("/amount ")}>
        <StatusIcon done={entry.amount > 0} hasError={entryErrors?.has("amount") ?? false} />
        金額: {entry.amount > 0 ? entry.amount.toLocaleString() : "—"}
        <span className="ml-auto text-muted-foreground text-xs">/amount</span>
      </CommandItem>
      <CommandItem
        value="/debit"
        onSelect={() => {
          updateEntry({ kind: JournalEntryKind.Debit })
          setInputValue("")
        }}
      >
        <KindIndicator active={entry.kind === JournalEntryKind.Debit} />
        借方 (Debit)
        <span className="ml-auto text-muted-foreground text-xs">/debit</span>
      </CommandItem>
      <CommandItem
        value="/credit"
        onSelect={() => {
          updateEntry({ kind: JournalEntryKind.Credit })
          setInputValue("")
        }}
      >
        <KindIndicator active={entry.kind === JournalEntryKind.Credit} />
        貸方 (Credit)
        <span className="ml-auto text-muted-foreground text-xs">/credit</span>
      </CommandItem>
    </CommandGroup>
  )
}

const StatusIcon = ({ done, hasError }: { done: boolean; hasError: boolean }) => {
  if (hasError) return <CircleX className="size-4 shrink-0 text-destructive" />
  if (done) return <CircleCheck className="size-4 shrink-0 text-green-500" />
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />
}

const KindIndicator = ({ active }: { active: boolean }) => {
  if (active) return <CircleCheck className="size-4 shrink-0 text-green-500" />
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />
}
