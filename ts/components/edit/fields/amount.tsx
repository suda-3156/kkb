"use client"

import { useRef, useState } from "react"
import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { containsOperator, evaluateAmount } from "@/lib/calc"
import { deleteBefore, insertAt, type TextEdit } from "@/lib/textedit"
import { AmountKeypad } from "./keypad"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

// When not being edited the amount shows with digit separators (47,000). While
// editing, the raw text is kept as typed so an arithmetic expression can be entered.
const formatDisplay = (value: number): string => {
  if (value == null || Number.isNaN(value)) return ""
  return value.toLocaleString()
}

export const AmountField = ({
  name,
  form,
  disabled,
  hideLabel,
}: {
  name: string
  form: AnyForm
  disabled?: boolean
  hideLabel?: boolean
}) => {
  // Raw text while editing. null means not editing, so the form value is shown
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isMobile = useIsMobile()

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => {
        // Keep the form value in step while the text still evaluates, so the debit
        // and credit totals update as the user types. An incomplete state such as
        // "1200+" keeps the previous value and commits on blur or on done.
        const edit = (next: string) => {
          setDraft(next)
          const value = next.trim() === "" ? Number.NaN : evaluateAmount(next)
          if (value !== null) field.onChange(value)
        }

        // Keypad input. Restore the caret after the re-render
        const editWithCaret = ({ value, caret }: TextEdit) => {
          edit(value)
          requestAnimationFrame(() => inputRef.current?.setSelectionRange(caret, caret))
        }

        // The DOM owns the caret position; append at the end when it is unavailable
        const selection = () => {
          const value = draft ?? ""
          const el = inputRef.current
          return {
            value,
            start: el?.selectionStart ?? value.length,
            end: el?.selectionEnd ?? value.length,
          }
        }

        const commit = () => {
          if (draft === null) return
          const value = draft.trim() === "" ? Number.NaN : evaluateAmount(draft)
          field.onChange(value ?? Number.NaN)
          setDraft(null)
        }

        // Evaluate the expression in place and replace the text (the calculator's =)
        const equals = () => {
          if (draft === null) return
          const value = evaluateAmount(draft)
          if (value === null) return
          field.onChange(value)
          setDraft(String(value))
        }

        const preview = draft !== null && containsOperator(draft) ? evaluateAmount(draft) : null

        return (
          <Field data-invalid={fieldState.invalid}>
            {!hideLabel && <FieldLabel>金額</FieldLabel>}
            <Input
              type="text"
              // On mobile, suppress the OS keyboard and take input from our own
              // keypad instead: the numeric keyboard offers no arithmetic operators.
              // Focus and caret survive. If a device ignores inputMode="none",
              // readOnly is the fallback.
              inputMode={isMobile ? "none" : "numeric"}
              placeholder="0"
              autoComplete="off"
              name={field.name}
              ref={(el) => {
                inputRef.current = el
                field.ref(el)
              }}
              value={draft ?? formatDisplay(field.value)}
              onChange={(e) => edit(e.target.value)}
              onFocus={(e) => {
                const value = field.value
                setDraft(value == null || Number.isNaN(value) ? "" : String(value))
                if (isMobile) {
                  // Scroll the field toward the middle so the keypad does not cover it
                  const el = e.currentTarget
                  requestAnimationFrame(() => el.scrollIntoView({ block: "center" }))
                }
              }}
              onBlur={() => {
                commit()
                field.onBlur()
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || draft === null || !containsOperator(draft)) return
                // While an expression is open, Enter evaluates rather than submits
                e.preventDefault()
                equals()
              }}
              disabled={disabled}
            />
            {!isMobile && preview !== null && (
              <p className="text-muted-foreground text-xs">= {preview.toLocaleString()}</p>
            )}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            {isMobile && !disabled && (
              <AmountKeypad
                open={draft !== null}
                expression={draft ?? ""}
                preview={preview}
                inputRef={inputRef}
                onInsert={(text) => {
                  const { value, start, end } = selection()
                  editWithCaret(insertAt(value, start, end, text))
                }}
                onBackspace={() => {
                  const { value, start, end } = selection()
                  editWithCaret(deleteBefore(value, start, end))
                }}
                onClear={() => editWithCaret({ value: "", caret: 0 })}
                onEquals={equals}
                // Committing has to be explicit. blur() does nothing when focus has
                // already left the input, which is exactly the state iOS leaves the
                // field in, and the keypad then had no way to close. Blur as well, so
                // the next tap on the input fires onFocus and reopens the keypad.
                onDone={() => {
                  commit()
                  inputRef.current?.blur()
                }}
              />
            )}
          </Field>
        )
      }}
    />
  )
}
