"use client"

import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

type DebitCreditValue = "debit" | "credit"

interface DebitCreditToggleProps {
  value?: DebitCreditValue
  defaultValue?: DebitCreditValue
  onValueChange?: (value: DebitCreditValue) => void
  size?: "sm" | "default"
  className?: string
}

function DebitCreditToggle({
  value,
  defaultValue = "debit",
  onValueChange,
  size = "default",
  className,
}: DebitCreditToggleProps) {
  return (
    <RadioGroup
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val: DebitCreditValue) => onValueChange?.(val)}
      aria-label="借方・貸方"
      className={cn(
        "inline-flex shrink-0 rounded-md border border-input bg-transparent p-0.5 shadow-xs dark:bg-input/30",
        className,
      )}
    >
      <Radio.Root
        value="debit"
        aria-label="借方"
        className={cn(
          "relative inline-flex h-8 cursor-pointer select-none items-center justify-center rounded-[calc(var(--radius-md)-2px)] font-bold text-sm transition-all",
          "text-muted-foreground hover:text-blue-500",
          "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-checked:bg-primary/80 data-checked:text-white data-checked:shadow-xs",
          size === "default" ? "gap-0.5 px-3" : "px-2",
        )}
      >
        <span>借</span>
        <span className={cn(size !== "default" && "hidden")}>方</span>
      </Radio.Root>

      <Radio.Root
        value="credit"
        aria-label="貸方"
        className={cn(
          "relative inline-flex h-8 cursor-pointer select-none items-center justify-center rounded-[calc(var(--radius-md)-2px)] font-bold text-sm transition-all",
          "text-muted-foreground hover:text-red-500",
          "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-checked:bg-primary/80 data-checked:text-white data-checked:shadow-xs",
          size === "default" ? "gap-0.5 px-3" : "px-2",
        )}
      >
        <span>貸</span>
        <span className={cn(size !== "default" && "hidden")}>方</span>
      </Radio.Root>
    </RadioGroup>
  )
}

export { DebitCreditToggle }
export type { DebitCreditValue }
