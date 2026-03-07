"use client"

import { useSetAtom } from "jotai"
import { openModalAtom } from "@/components/edit/state"
import { cn } from "@/lib/utils"

export type RecentTransactionItem = {
  id: string
  date: string // MM/DD
  description: string
  categoryName: string
  amount: number
  type: "expense" | "revenue" | "other"
}

type Props = {
  items: RecentTransactionItem[]
}

export const RecentTransactionList = ({ items }: Props) => {
  const openEditModal = useSetAtom(openModalAtom)

  if (items.length === 0) {
    return <p className="py-4 text-center text-muted-foreground text-sm">取引がありません</p>
  }

  return (
    <div className="divide-y">
      {items.map((tx) => (
        <button
          key={tx.id}
          type="button"
          onClick={() => {
            openEditModal("txn", tx.id)
          }}
          className="flex w-full cursor-pointer items-center justify-between px-6 py-3 text-left transition-colors hover:bg-muted/60"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-muted-foreground text-xs tabular-nums">
              {tx.date}
            </span>
            <div>
              <p className="font-medium text-sm">{tx.description}</p>
              <p className="text-muted-foreground text-xs">{tx.categoryName}</p>
            </div>
          </div>
          <span
            className={cn("font-semibold text-sm tabular-nums", {
              "text-emerald-600 dark:text-emerald-400": tx.type === "revenue",
              "text-rose-500": tx.type === "expense",
              "text-muted-foreground": tx.type === "other",
            })}
          >
            {resolveSign(tx.type)}¥{tx.amount.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  )
}

const resolveSign = (type: RecentTransactionItem["type"]) => {
  switch (type) {
    case "revenue":
      return "+"
    case "expense":
      return "−"
    default:
      return ""
  }
}
