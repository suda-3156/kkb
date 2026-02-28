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
  type ExpenseInputField,
  enterHandlerAtom,
  expenseInputAtom,
  expenseValidationErrorsAtom,
  inputValueAtom,
  navigateAtom,
  pageLabels,
  resetAtom,
  selectLedgerAccountContextAtom,
} from "../state"

const CreateExpenseTransaction = graphql(/* GraphQL */ `
  mutation CreateExpenseTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
    }
  }
`)

const page: CmdPage = "inputExpense"

export const InputExpenseCmdPage = () => {
  const [input, setInput] = useAtom(expenseInputAtom)
  const setInputValue = useSetAtom(inputValueAtom)
  const setEnterHandler = useSetAtom(enterHandlerAtom)
  const setCmdEnterHandler = useSetAtom(cmdEnterHandlerAtom)
  const navigate = useSetAtom(navigateAtom)
  const setSelectContext = useSetAtom(selectLedgerAccountContextAtom)
  const [validationErrors, setValidationErrors] = useAtom(expenseValidationErrorsAtom)
  const reset = useSetAtom(resetAtom)

  const [createTransaction] = useMutation(CreateExpenseTransaction)

  const goToSelectLedgerAccount = React.useCallback(
    (field: "paymentMethod" | "category", kind: LedgerAccountKind) => {
      setSelectContext({
        kind,
        onSelect: (account) => {
          if (field === "paymentMethod") {
            setInput({ paymentMethod: account.name, paymentMethodId: account.id })
          } else {
            setInput({ category: account.name, categoryId: account.id })
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

  React.useEffect(() => {
    setCmdEnterHandler(() => async () => {
      const errors = new Set<ExpenseInputField>()
      // amount must be greater than 0
      if (input.amount <= 0) errors.add("amount")
      // paymentMethod is required
      if (!input.paymentMethod) errors.add("paymentMethod")
      // category is required)
      if (!input.category) errors.add("category")
      // date is required and must be a valid date string and of the format YYYY-MM-DD
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
                  ledgerAccountId: input.categoryId,
                  amount: input.amount,
                  kind: JournalEntryKind.Debit,
                },
                {
                  ledgerAccountId: input.paymentMethodId,
                  amount: input.amount,
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
        toast.success("支出を記録しました")
        reset()
      } catch {
        toast.error("支出の記録に失敗しました")
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
        value="/payment"
        onSelect={() => goToSelectLedgerAccount("paymentMethod", LedgerAccountKind.Asset)}
      >
        <StatusIcon
          done={input.paymentMethod !== ""}
          hasError={validationErrors.has("paymentMethod")}
        />
        支払い方法: {input.paymentMethod}
        <span className="ml-auto text-muted-foreground text-xs">/payment</span>
      </CommandItem>
      <CommandItem
        value="/category"
        onSelect={() => goToSelectLedgerAccount("category", LedgerAccountKind.Expense)}
      >
        <StatusIcon done={input.category !== ""} hasError={validationErrors.has("category")} />
        カテゴリ: {input.category}{" "}
        <span className="ml-auto text-muted-foreground text-xs">/category</span>
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
