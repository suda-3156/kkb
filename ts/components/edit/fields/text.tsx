import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// No `required` on the input. The native attribute makes the browser refuse to
// submit and show its own message, which stops react-hook-form from ever
// running: with the field empty, none of the schema's messages could appear and
// the other fields' errors stayed hidden behind it. Requiredness is the
// schema's to state.

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

type Props = {
  name: string
  label: string
  placeholder?: string
  maxLength?: number

  form: AnyForm
  disabled?: boolean
}

export const TextField = ({ name, label, placeholder, maxLength, form, disabled }: Props) => {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Input placeholder={placeholder} maxLength={maxLength} {...field} disabled={disabled} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
