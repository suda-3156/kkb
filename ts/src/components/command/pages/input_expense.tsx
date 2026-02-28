"use client"

import { useAtom, useSetAtom } from "jotai"
import { Circle, CircleCheck } from "lucide-react"
import * as React from "react"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { LedgerAccountKind } from "@/graph/graphql"
import {
  type CmdPage,
  cmdPageAtom,
  enterHandlerAtom,
  expenseInputAtom,
  inputValueAtom,
  pageLabels,
  selectLedgerAccountContextAtom,
} from "../state"

const page: CmdPage = "inputExpense"

export const InputExpenseCmdPage = () => {
  const [input, setInput] = useAtom(expenseInputAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setPage = useSetAtom(cmdPageAtom)
  const setSelectContext = useSetAtom(selectLedgerAccountContextAtom)

  const goToSelectLedgerAccount = React.useCallback(
    (field: "paymentMethod" | "category", kind: LedgerAccountKind) => {
      setSelectContext({
        kind,
        returnPage: "inputExpense",
        onSelect: (account) => setInput({ [field]: account.name }),
      })
      setPage("selectLedgerAccount")
      setInputValue("")
    },
    [setSelectContext, setPage, setInputValue, setInput],
  )

  React.useEffect(() => {
    setEnterHandler(() => (value: string) => {
      const amountMatch = value.match(/^\/amount\s+(\d+(?:\.\d+)?)?$/)
      if (amountMatch) {
        setInput({ amount: Number(amountMatch[1] ?? 0) })
        setInputValue("")
        return true
      }
      if (/^\/payment\s*$/.test(value)) {
        goToSelectLedgerAccount("paymentMethod", LedgerAccountKind.Asset)
        return true
      }
      if (/^\/category\s*$/.test(value)) {
        goToSelectLedgerAccount("category", LedgerAccountKind.Expense)
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
  }, [setInput, setInputValue, setEnterHandler, goToSelectLedgerAccount])

  return (
    <CommandGroup forceMount heading={pageLabels[page]}>
      <CommandItem onSelect={() => setInputValue("/amount ")}>
        <StatusIcon done={input.amount !== 0} />
        金額: {input.amount} <span className="ml-auto text-muted-foreground text-xs">/amount</span>
      </CommandItem>
      <CommandItem
        onSelect={() => goToSelectLedgerAccount("paymentMethod", LedgerAccountKind.Asset)}
      >
        <StatusIcon done={input.paymentMethod !== ""} />
        支払い方法: {input.paymentMethod}
        <span className="ml-auto text-muted-foreground text-xs">/payment</span>
      </CommandItem>
      <CommandItem onSelect={() => goToSelectLedgerAccount("category", LedgerAccountKind.Expense)}>
        <StatusIcon done={input.category !== ""} />
        カテゴリ: {input.category}{" "}
        <span className="ml-auto text-muted-foreground text-xs">/category</span>
      </CommandItem>
      <CommandItem onSelect={() => setInputValue("/date ")}>
        <StatusIcon done={input.date !== ""} />
        日付: {input.date} <span className="ml-auto text-muted-foreground text-xs">/date</span>
      </CommandItem>
      <CommandItem onSelect={() => setInputValue("/memo ")}>
        <StatusIcon done={input.description !== ""} />
        メモ: {input.description}{" "}
        <span className="ml-auto text-muted-foreground text-xs">/memo</span>
      </CommandItem>
    </CommandGroup>
  )
}

const StatusIcon = ({ done }: { done: boolean }) =>
  done ? (
    <CircleCheck className="size-4 text-green-500" />
  ) : (
    <Circle className="size-4 text-muted-foreground/50" />
  )
