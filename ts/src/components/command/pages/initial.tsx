"use client"

import { useSetAtom } from "jotai"
import { CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { type CmdPage, navigateAtom, pageLabels } from "../state"

const page: CmdPage = "initial"

export const InitialCmdPage = () => {
  const navigate = useSetAtom(navigateAtom)

  const handleSelect = (
    nextPage: "inputExpense" | "inputRevenue" | "inputTransfer" | "inputTransaction",
  ) => {
    navigate(nextPage)
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
        <CommandItem value="/transfer" onSelect={() => handleSelect("inputTransfer")}>
          振替を入力<span className="ml-auto text-muted-foreground text-xs">/transfer</span>
        </CommandItem>
        <CommandItem value="/transaction" onSelect={() => handleSelect("inputTransaction")}>
          取引を入力
          <span className="ml-auto text-muted-foreground text-xs">/transaction</span>
        </CommandItem>
      </CommandGroup>
    </>
  )
}
