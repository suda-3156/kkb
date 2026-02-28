"use client"

import { CommandGroup, CommandItem } from "@/components/ui/command"
import { type CmdPage, pageLabels } from "../state"

const page: CmdPage = "inputTransaction"

export const InputTransactionCmdPage = () => {
  return (
    <CommandGroup heading={pageLabels[page]}>
      <CommandItem>借方勘定科目</CommandItem>
      <CommandItem>貸方勘定科目</CommandItem>
      <CommandItem>金額を入力</CommandItem>
    </CommandGroup>
  )
}
