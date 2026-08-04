"use client"

import { Delete } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// モバイル(画面幅 < 640px)の金額入力で使う電卓キーパッド。
// input 側は inputMode="none" で OS の仮想キーボードを抑止しているので、
// 数字も演算子もここからしか入らない。
//
// ボタンを押しても input のフォーカスが外れないよう、コンテナの pointerdown を
// preventDefault する(click は発火する)。フォーカスが外れると draft が確定し、
// キーパッド自体が閉じてしまうため。

type KeyDef =
  | { kind: "insert"; label: string; text: string; className?: string }
  | { kind: "action"; label: React.ReactNode; action: "backspace" | "clear" | "equals" }

const KEYS: KeyDef[] = [
  { kind: "insert", label: "7", text: "7" },
  { kind: "insert", label: "8", text: "8" },
  { kind: "insert", label: "9", text: "9" },
  { kind: "insert", label: "÷", text: "/", className: "bg-muted" },
  { kind: "insert", label: "4", text: "4" },
  { kind: "insert", label: "5", text: "5" },
  { kind: "insert", label: "6", text: "6" },
  { kind: "insert", label: "×", text: "*", className: "bg-muted" },
  { kind: "insert", label: "1", text: "1" },
  { kind: "insert", label: "2", text: "2" },
  { kind: "insert", label: "3", text: "3" },
  { kind: "insert", label: "−", text: "-", className: "bg-muted" },
  { kind: "insert", label: "0", text: "0" },
  { kind: "insert", label: "00", text: "00" },
  { kind: "action", label: <Delete className="size-5" />, action: "backspace" },
  { kind: "insert", label: "+", text: "+", className: "bg-muted" },
  { kind: "action", label: "C", action: "clear" },
  { kind: "insert", label: "(", text: "(", className: "bg-muted" },
  { kind: "insert", label: ")", text: ")", className: "bg-muted" },
  { kind: "action", label: "=", action: "equals" },
]

export const AmountKeypad = ({
  open,
  expression,
  preview,
  onInsert,
  onBackspace,
  onClear,
  onEquals,
  onDone,
}: {
  /** 金額欄が編集中か。閉じるときのスライドアウトのためにマウントは保つ */
  open: boolean
  expression: string
  /** 式として評価できていれば計算結果。数字だけ / 未評価なら null */
  preview: number | null
  onInsert: (text: string) => void
  onBackspace: () => void
  onClear: () => void
  onEquals: () => void
  onDone: () => void
}) => {
  if (typeof document === "undefined") return null

  const run = (key: KeyDef) => {
    if (key.kind === "insert") return onInsert(key.text)
    if (key.action === "backspace") return onBackspace()
    if (key.action === "clear") return onClear()
    return onEquals()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.fieldset
          key="amount-keypad"
          aria-label="電卓キーパッド"
          className="fixed inset-x-0 bottom-0 z-60 border-t bg-background shadow-lg"
          onPointerDown={(e) => e.preventDefault()}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="truncate font-mono text-sm">{expression || "0"}</span>
            {preview !== null && (
              <span className="shrink-0 text-muted-foreground text-sm">
                = {preview.toLocaleString()}
              </span>
            )}
            <Button type="button" size="sm" className="ml-auto shrink-0" onClick={onDone}>
              完了
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {KEYS.map((key) => (
              <Button
                key={key.kind === "insert" ? key.text : key.action}
                type="button"
                variant="outline"
                className={cn("h-12 text-base", key.kind === "insert" && key.className)}
                aria-label={
                  key.kind === "action" && key.action === "backspace" ? "1 文字削除" : undefined
                }
                onClick={() => run(key)}
              >
                {key.label}
              </Button>
            ))}
          </div>
        </motion.fieldset>
      )}
    </AnimatePresence>,
    document.body,
  )
}
