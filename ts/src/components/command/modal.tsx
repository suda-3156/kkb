"use client"

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import * as React from "react"
import { Command, CommandDialog, CommandInput, CommandList } from "../ui/command"
import { InitialCmdPage } from "./pages/initial"
import { InputExpenseCmdPage } from "./pages/input_expense"
import { InputRevenueCmdPage } from "./pages/input_revenue"
import { InputTransactionCmdPage } from "./pages/input_transaction"
import { SelectLedgerAccountCmdPage } from "./pages/select_ledger_account"
import {
  cmdContextAtom,
  cmdEnterHandlerAtom,
  cmdPageAtom,
  defaultCmdContext,
  enterHandlerAtom,
  goBackAtom,
  inputValueAtom,
  resetAtom,
} from "./state"

export const CommandModal = () => {
  const page = useAtomValue(cmdPageAtom)
  const [inputValue, setInputValue] = useAtom(inputValueAtom)
  const enterHandler = useAtomValue(enterHandlerAtom)
  const cmdEnterHandler = useAtomValue(cmdEnterHandlerAtom)
  const setContext = useSetAtom(cmdContextAtom)
  const goBack = useSetAtom(goBackAtom)
  const reset = useSetAtom(resetAtom)

  const openModal = React.useCallback(() => {
    setContext({ ...defaultCmdContext, page: "initial" })
  }, [setContext])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (page === "closed") {
          openModal()
        } else {
          reset()
        }
      }
      if (e.key === "h" && (e.metaKey || e.ctrlKey) && page !== "closed") {
        e.preventDefault()
        goBack()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [page, openModal, reset, goBack])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    if (e.nativeEvent.isComposing) return
    if ((e.metaKey || e.ctrlKey) && cmdEnterHandler) {
      e.preventDefault()
      cmdEnterHandler()
      return
    }
    if (enterHandler?.(inputValue)) {
      e.preventDefault()
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset()
    }
  }

  return (
    <CommandDialog
      className="max-w-sm rounded-lg border"
      open={page !== "closed"}
      onOpenChange={handleOpenChange}
    >
      <Command>
        <CommandInput
          placeholder="Type a command or search..."
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
        />
        <CommandList>
          {page === "initial" && <InitialCmdPage />}

          {page === "inputExpense" && <InputExpenseCmdPage />}

          {page === "inputRevenue" && <InputRevenueCmdPage />}

          {page === "inputTransaction" && <InputTransactionCmdPage />}

          {page === "selectLedgerAccount" && <SelectLedgerAccountCmdPage />}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
