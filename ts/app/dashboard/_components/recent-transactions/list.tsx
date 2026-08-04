"use client"

import { useSetAtom } from "jotai"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { openModalAtom } from "@/components/edit/state"
import { useTransaction } from "@/components/edit/use-transaction"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
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
  const { remove, loading } = useTransaction()
  // 削除確認中の取引。null = 確認ダイアログを出していない
  const [target, setTarget] = useState<RecentTransactionItem | null>(null)

  if (items.length === 0) {
    return <p className="py-4 text-center text-muted-foreground text-sm">取引がありません</p>
  }

  return (
    <>
      <div className="divide-y">
        {items.map((tx) => (
          // 行のクリックで編集、右端のボタンで削除。button の入れ子は不正なので、
          // 行は div にしてクリック領域と削除ボタンを兄弟に置く。
          <div
            key={tx.id}
            className="group flex items-center pr-3 transition-colors hover:bg-muted/60"
          >
            <button
              type="button"
              onClick={() => {
                openEditModal("txn", tx.id)
              }}
              className="flex flex-1 cursor-pointer items-center justify-between gap-3 px-6 py-3 text-left"
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

            {/* モバイル(< sm)は hover が無いので常時表示。それ以上では行に触れたときだけ出す */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${tx.description} を削除`}
              disabled={loading}
              className="ml-1 shrink-0 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              onClick={() => setTarget(tx)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title="この取引を削除しますか?"
        description={
          target
            ? `${target.date} ${target.description} ¥${target.amount.toLocaleString()} — 削除すると元に戻せません。`
            : undefined
        }
        confirmLabel="削除する"
        destructive
        loading={loading}
        onConfirm={() => {
          if (!target) return
          remove(target.id, { success: "削除しました", error: "削除に失敗しました" })
          setTarget(null)
        }}
      />
    </>
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
