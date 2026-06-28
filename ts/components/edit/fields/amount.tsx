import { useState } from "react"
import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

// When blurred the value is shown with thousands separators (e.g. 47,000).
// When focused the raw digits are shown so the user can edit without commas.
const formatDisplay = (value: number, focused: boolean): string => {
  if (value == null || Number.isNaN(value)) return ""
  return focused ? String(value) : value.toLocaleString()
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
  const [focused, setFocused] = useState(false)

  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {!hideLabel && <FieldLabel>金額</FieldLabel>}
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            name={field.name}
            ref={field.ref}
            value={formatDisplay(field.value, focused)}
            onChange={(e) => {
              // Accept input with or without commas; keep only the digits.
              const digits = e.target.value.replace(/[^\d]/g, "")
              field.onChange(digits === "" ? Number.NaN : Number(digits))
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              field.onBlur()
            }}
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
