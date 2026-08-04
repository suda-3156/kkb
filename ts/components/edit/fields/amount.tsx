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

// 未編集時は桁区切り表示(例 47,000)。編集中は入力テキストをそのまま保持する
// (四則演算の式を打てるようにするため)。
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
  // 編集中の生テキスト。null = 非編集(フォームの値を表示)
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isMobile = useIsMobile()

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => {
        // 式として評価できる間はフォームの値も追随させる(仕訳の借方・貸方合計が
        // 入力中に更新される)。"1200+" のような途中の状態では直前の値を保ち、
        // blur / 完了 のタイミングで確定させる。
        const edit = (next: string) => {
          setDraft(next)
          const value = next.trim() === "" ? Number.NaN : evaluateAmount(next)
          if (value !== null) field.onChange(value)
        }

        // キーパッド操作。再レンダリング後にキャレット位置を戻す
        const editWithCaret = ({ value, caret }: TextEdit) => {
          edit(value)
          requestAnimationFrame(() => inputRef.current?.setSelectionRange(caret, caret))
        }

        // キャレット位置は DOM 側が持つ。取れなければ末尾に足す
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

        // 式をその場で計算して置き換える(電卓の = )
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
              // モバイルでは OS の仮想キーボードを抑止し、自前のキーパッドで入力する
              // (数字キーパッドには四則演算の記号が無いため)。フォーカス・キャレットは
              // 保たれる。端末が inputMode="none" を無視する場合は readOnly が代替手段。
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
                  // キーパッドで隠れないように入力欄を画面中央へ寄せる
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
                // 式の入力中の Enter は送信ではなく計算に使う
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
                onDone={() => inputRef.current?.blur()}
              />
            )}
          </Field>
        )
      }}
    />
  )
}
