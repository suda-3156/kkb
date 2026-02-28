"use client"

import { useSetAtom } from "jotai"
import { CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { type CmdPage, cmdPageAtom, inputValueAtom, pageLabels } from "../state"

const page: CmdPage = "initial"

export const InitialCmdPage = () => {
  const setPage = useSetAtom(cmdPageAtom)
  const setInputValue = useSetAtom(inputValueAtom)

  const handleSelect = (nextPage: "inputExpense" | "inputRevenue" | "inputTransaction") => {
    setPage(nextPage)
    setInputValue("")
  }

  return (
    <>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading={pageLabels[page]}>
        <CommandItem value="/expense" onSelect={() => handleSelect("inputExpense")}>
          支出を入力<span className="ml-auto text-muted-foreground text-xs">/expense</span>
        </CommandItem>
        <CommandItem value="/revenue" onSelect={() => handleSelect("inputRevenue")}>
          収入を入力<span className="ml-auto text-muted-foreground text-xs">/revenue</span>
        </CommandItem>
        <CommandItem value="/transaction" onSelect={() => handleSelect("inputTransaction")}>
          取引を入力
          <span className="ml-auto text-muted-foreground text-xs">/transaction</span>
        </CommandItem>
      </CommandGroup>
    </>
  )
}
