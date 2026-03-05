import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

export const DateField = ({
  name,
  form,
  disabled,
}: {
  name: string
  form: AnyForm
  disabled?: boolean
}) => {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>日付</FieldLabel>
          <Input placeholder="YYYY-MM-DD" {...field} disabled={disabled} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
