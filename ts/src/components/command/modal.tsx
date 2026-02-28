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
  cmdEnterHandlerAtom,
  cmdPageAtom,
  enterHandlerAtom,
  inputValueAtom,
  resetAtom,
} from "./state"

export const CommandModal = () => {
  const [page, setPage] = useAtom(cmdPageAtom)
  const [inputValue, setInputValue] = useAtom(inputValueAtom)
  const enterHandler = useAtomValue(enterHandlerAtom)
  const cmdEnterHandler = useAtomValue(cmdEnterHandlerAtom)
  const reset = useSetAtom(resetAtom)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPage((p) => (p === "closed" ? "initial" : "closed"))
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setPage])

  React.useEffect(() => {
    if (page === "closed") {
      reset()
    }
  }, [page, reset])

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
