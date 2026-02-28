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
  type RevenueInputField,
  resetAtom,
  revenueInputAtom,
  revenueValidationErrorsAtom,
  selectLedgerAccountContextAtom,
} from "../state"

const CreateRevenueTransaction = graphql(/* GraphQL */ `
  mutation CreateRevenueTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
    }
  }
`)

const page: CmdPage = "inputRevenue"

export const InputRevenueCmdPage = () => {
  const [input, setInput] = useAtom(revenueInputAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setCmdEnterHandler = useSetAtom(cmdEnterHandlerAtom)
  const navigate = useSetAtom(navigateAtom)
  const setSelectContext = useSetAtom(selectLedgerAccountContextAtom)
  const [validationErrors, setValidationErrors] = useAtom(revenueValidationErrorsAtom)
  const reset = useSetAtom(resetAtom)

  const [createTransaction] = useMutation(CreateRevenueTransaction)

  const goToSelectLedgerAccount = React.useCallback(
    (field: "depositAccount" | "source", kind: LedgerAccountKind) => {
      setSelectContext({
        kind,
        onSelect: (account) => {
          if (field === "depositAccount") {
            setInput({ depositAccount: account.name, depositAccountId: account.id })
          } else {
            setInput({ source: account.name, sourceId: account.id })
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
      if (/^\/deposit\s*$/.test(value)) {
        goToSelectLedgerAccount("depositAccount", LedgerAccountKind.Asset)
        return true
      }
      if (/^\/source\s*$/.test(value)) {
        goToSelectLedgerAccount("source", LedgerAccountKind.Revenue)
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
      const errors = new Set<RevenueInputField>()
      // amount must be greater than 0
      if (input.amount <= 0) errors.add("amount")
      // depositAccount is required
      if (!input.depositAccount) errors.add("depositAccount")
      // source is required
      if (!input.source) errors.add("source")
      // date is required and must be a valid date string of the format YYYY-MM-DD
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
                  ledgerAccountId: input.depositAccountId,
                  amount: input.amount,
                  kind: JournalEntryKind.Debit,
                },
                {
                  ledgerAccountId: input.sourceId,
                  amount: input.amount,
                  kind: JournalEntryKind.Credit,
                },
              ],
            },
          },
          refetchQueries: ["RecentTransactions"],
          awaitRefetchQueries: true,
        })
        toast.success("収入を記録しました")
        reset()
      } catch {
        toast.error("収入の記録に失敗しました")
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
      <CommandItem
        value="/deposit"
        onSelect={() => goToSelectLedgerAccount("depositAccount", LedgerAccountKind.Asset)}
      >
        <StatusIcon
          done={input.depositAccount !== ""}
          hasError={validationErrors.has("depositAccount")}
        />
        入金先: {input.depositAccount}
        <span className="ml-auto text-muted-foreground text-xs">/deposit</span>
      </CommandItem>
      <CommandItem
        value="/source"
        onSelect={() => goToSelectLedgerAccount("source", LedgerAccountKind.Revenue)}
      >
        <StatusIcon done={input.source !== ""} hasError={validationErrors.has("source")} />
        収入源: {input.source}{" "}
        <span className="ml-auto text-muted-foreground text-xs">/source</span>
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
