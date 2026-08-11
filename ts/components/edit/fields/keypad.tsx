"use client"

import { Delete } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Calculator keypad for the amount field on mobile (viewport < 640px).
// The input suppresses the OS keyboard with inputMode="none", so digits and
// operators can only arrive from here.
//
// The container preventDefaults pointerdown so pressing a button never blurs the
// input (click still fires). Losing focus would commit the draft and close the
// keypad itself.

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
  inputRef,
  onInsert,
  onBackspace,
  onClear,
  onEquals,
  onDone,
}: {
  /** Whether the amount field is being edited. Stays mounted so it can slide out */
  open: boolean
  expression: string
  /** The result when the text evaluates; null for a bare number or an invalid one */
  preview: number | null
  /** The amount input, so touching it is not mistaken for leaving the field */
  inputRef: React.RefObject<HTMLInputElement | null>
  onInsert: (text: string) => void
  onBackspace: () => void
  onClear: () => void
  onEquals: () => void
  onDone: () => void
}) => {
  const rootRef = React.useRef<HTMLFieldSetElement | null>(null)

  // The listener below has to reach the current onDone without resubscribing on
  // every keystroke, and onDone is a new closure on each render.
  const onDoneRef = React.useRef(onDone)
  React.useEffect(() => {
    onDoneRef.current = onDone
  })

  // The input's own blur cannot be the only thing that ends the edit: iOS does not
  // reliably fire it when another field is activated, and Base UI's combobox trigger
  // deliberately takes no focus on touch, so tapping `>` moves focus nowhere at all.
  // Either symptom left the keypad stranded on screen. Anything that takes focus
  // elsewhere, or any tap outside both the input and the keypad, also ends the edit.
  //
  // `click` rather than `pointerdown`: a scroll gesture must not dismiss the keypad.
  React.useEffect(() => {
    if (!open) {
      return
    }
    const end = (event: Event) => {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      if (rootRef.current?.contains(target) || inputRef.current?.contains(target)) {
        return
      }
      onDoneRef.current()
    }
    document.addEventListener("focusin", end, true)
    document.addEventListener("click", end, true)
    return () => {
      document.removeEventListener("focusin", end, true)
      document.removeEventListener("click", end, true)
    }
  }, [open, inputRef])

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
          ref={rootRef}
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
