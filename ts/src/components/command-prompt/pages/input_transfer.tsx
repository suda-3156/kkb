"use client"

import { useMutation } from "@apollo/client/react"
import { useAtom, useSetAtom } from "jotai"
import { Circle, CircleCheck, CircleX } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { graphql } from "@/graph"
import { JournalEntryKind, LedgerAccountKind } from "@/graph/graphql"
import {
  type CmdPage,
  cmdEnterHandlerAtom,
  enterHandlerAtom,
  inputValueAtom,
  navigateAtom,
  pageLabels,
  resetAtom,
  selectLedgerAccountContextAtom,
  type TransferInputField,
  transferInputAtom,
  transferValidationErrorsAtom,
} from "../state"

const CreateTransferTransaction = graphql(/* GraphQL */ `
  mutation CreateTransferTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
    }
  }
`)

const page: CmdPage = "inputTransfer"

export const InputTransferCmdPage = () => {
  const [input, setInput] = useAtom(transferInputAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setCmdEnterHandler = useSetAtom(cmdEnterHandlerAtom)
  const navigate = useSetAtom(navigateAtom)
  const setSelectContext = useSetAtom(selectLedgerAccountContextAtom)
  const [validationErrors, setValidationErrors] = useAtom(transferValidationErrorsAtom)
  const reset = useSetAtom(resetAtom)

  const [createTransaction] = useMutation(CreateTransferTransaction)

  const goToSelectLedgerAccount = React.useCallback(
    (field: "fromAccount" | "toAccount") => {
      setSelectContext({
        kind: LedgerAccountKind.Asset,
        onSelect: (account) => {
          if (field === "fromAccount") {
            setInput({ fromAccount: account.name, fromAccountId: account.id })
          } else {
            setInput({ toAccount: account.name, toAccountId: account.id })
          }
        },
      })
      navigate("selectLedgerAccount")
    },
    [setSelectContext, navigate, setInput],
  )

  React.useEffect(() => {
    setEnterHandler(() => (value: string) => {
      const amountMatch = value.match(/^\/amount\s+(\d+(?:\.\d+)?)?$/)
      if (amountMatch) {
        setInput({ amount: Number(amountMatch[1] ?? 0) })
        setInputValue("")
        return true
      }
      if (/^\/from\s*$/.test(value)) {
        goToSelectLedgerAccount("fromAccount")
        return true
      }
      if (/^\/to\s*$/.test(value)) {
        goToSelectLedgerAccount("toAccount")
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

  React.useEffect(() => {
    setCmdEnterHandler(() => async () => {
      const errors = new Set<TransferInputField>()
      // amount must be greater than 0
      if (input.amount <= 0) errors.add("amount")
      // fromAccount is required
      if (!input.fromAccount) errors.add("fromAccount")
      // toAccount is required
      if (!input.toAccount) errors.add("toAccount")
      // date is required and must be a valid date of format YYYY-MM-DD
      if (!input.date) errors.add("date")
      if (Number.isNaN(new Date(input.date).getTime())) errors.add("date")
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.add("date")
      // description is required
      if (!input.description) errors.add("description")

      if (errors.size > 0) {
        setValidationErrors(errors)
        return
      }

      setValidationErrors(new Set())

      try {
        await createTransaction({
          variables: {
            input: {
              date: input.date,
              description: input.description,
              entries: [
                {
                  ledgerAccountId: input.toAccountId,
                  amount: input.amount,
                  kind: JournalEntryKind.Debit,
                },
                {
                  ledgerAccountId: input.fromAccountId,
                  amount: input.amount,
                  kind: JournalEntryKind.Credit,
                },
              ],
            },
          },
          refetchQueries: ["RecentTransactions"],
          awaitRefetchQueries: true,
        })
        toast.success("振替を記録しました")
        reset()
      } catch {
        toast.error("振替の記録に失敗しました")
        reset()
      }
    })
    return () => setCmdEnterHandler(null)
  }, [input, createTransaction, setValidationErrors, reset, setCmdEnterHandler])

  return (
    <CommandGroup forceMount heading={pageLabels[page]}>
      <CommandItem value="/amount" onSelect={() => setInputValue("/amount ")}>
        <StatusIcon done={input.amount !== 0} hasError={validationErrors.has("amount")} />
        金額: {input.amount} <span className="ml-auto text-muted-foreground text-xs">/amount</span>
      </CommandItem>
      <CommandItem value="/from" onSelect={() => goToSelectLedgerAccount("fromAccount")}>
        <StatusIcon
          done={input.fromAccount !== ""}
          hasError={validationErrors.has("fromAccount")}
        />
        振替元: {input.fromAccount}
        <span className="ml-auto text-muted-foreground text-xs">/from</span>
      </CommandItem>
      <CommandItem value="/to" onSelect={() => goToSelectLedgerAccount("toAccount")}>
        <StatusIcon done={input.toAccount !== ""} hasError={validationErrors.has("toAccount")} />
        振替先: {input.toAccount}
        <span className="ml-auto text-muted-foreground text-xs">/to</span>
      </CommandItem>
      <CommandItem value="/date" onSelect={() => setInputValue("/date ")}>
        <StatusIcon done={input.date !== ""} hasError={validationErrors.has("date")} />
        日付: {input.date} <span className="ml-auto text-muted-foreground text-xs">/date</span>
      </CommandItem>
      <CommandItem value="/memo" onSelect={() => setInputValue("/memo ")}>
        <StatusIcon
          done={input.description !== ""}
          hasError={validationErrors.has("description")}
        />
        メモ: {input.description}{" "}
        <span className="ml-auto text-muted-foreground text-xs">/memo</span>
      </CommandItem>
    </CommandGroup>
  )
}

const StatusIcon = ({ done, hasError }: { done: boolean; hasError: boolean }) => {
  if (hasError) return <CircleX className="size-4 text-destructive" />
  if (done) return <CircleCheck className="size-4 text-green-500" />
  return <Circle className="size-4 text-muted-foreground/50" />
}
