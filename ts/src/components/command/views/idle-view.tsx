"use client"

import { PlusCircleIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import type { CommandPage } from "../types"

type IdleViewProps = {
  onNavigate: (page: CommandPage) => void
}

export function IdleView({ onNavigate }: IdleViewProps) {
  return (
    <CommandList>
      <CommandEmpty>コマンドが見つかりません</CommandEmpty>

      <CommandGroup heading="取引を追加">
        <CommandItem
          value="/add expense"
          keywords={["add", "expense", "支出", "経費"]}
          onSelect={() => onNavigate("add-expense")}
        >
          <TrendingDownIcon className="size-4 text-destructive" />
          <span className="flex-1">支出を記録</span>
          <CommandShortcut className="font-mono">/add expense</CommandShortcut>
        </CommandItem>

        <CommandItem
          value="/add revenue"
          keywords={["add", "revenue", "収入"]}
          onSelect={() => onNavigate("add-revenue")}
        >
          <TrendingUpIcon className="size-4 text-green-500" />
          <span className="flex-1">収入を記録</span>
          <CommandShortcut className="font-mono">/add revenue</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="使い方">
        <CommandItem value="hint-add" disabled>
          <PlusCircleIcon className="size-4 opacity-40" />
          <span className="text-muted-foreground text-xs">
            /add expense → /desc 説明 → /pay 支払い → /amount 金額 → Enter
          </span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  )
}
