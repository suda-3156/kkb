"use client"

import { CommandGroup, CommandItem } from "@/components/ui/command"
import { type CmdPage, pageLabels } from "../state"

const page: CmdPage = "inputRevenue"

export const InputRevenueCmdPage = () => {
  return (
    <CommandGroup heading={pageLabels[page]}>
      <CommandItem>金額を入力</CommandItem>
      <CommandItem>カテゴリを選択</CommandItem>
    </CommandGroup>
  )
}
