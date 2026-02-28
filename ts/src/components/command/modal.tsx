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
  type CmdPage,
  cmdContextAtom,
  cmdEnterHandlerAtom,
  cmdPageAtom,
  defaultCmdContext,
  enterHandlerAtom,
  goBackAtom,
  inputValueAtom,
  resetAtom,
} from "./state"

/** ページごとに補完候補とするコマンド文字列 */
const COMMANDS_BY_PAGE: Partial<Record<CmdPage, string[]>> = {
  initial: ["/expense", "/revenue", "/transaction"],
  inputExpense: ["/amount ", "/payment", "/category", "/date ", "/memo "],
}

/** 現在の入力値に対してゴーストサフィックス（補完の残り部分）を返す */
function getGhostSuffix(page: CmdPage, inputValue: string): string {
  if (!inputValue) return ""
  const commands = COMMANDS_BY_PAGE[page]
  if (!commands) return ""
  const match = commands.find((cmd) => cmd.startsWith(inputValue) && cmd !== inputValue)
  return match ? match.slice(inputValue.length) : ""
}

export const CommandModal = () => {
  const page = useAtomValue(cmdPageAtom)
  const [inputValue, setInputValue] = useAtom(inputValueAtom)
  const enterHandler = useAtomValue(enterHandlerAtom)
  const cmdEnterHandler = useAtomValue(cmdEnterHandlerAtom)
  const setContext = useSetAtom(cmdContextAtom)
  const goBack = useSetAtom(goBackAtom)
  const reset = useSetAtom(resetAtom)

  const ghostSuffix = getGhostSuffix(page, inputValue)

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
    if (e.nativeEvent.isComposing) return
    if (e.key === "Tab" && ghostSuffix) {
      e.preventDefault()
      setInputValue(inputValue + ghostSuffix)
      return
    }
    if (e.key !== "Enter") return
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
          ghostSuffix={ghostSuffix}
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
