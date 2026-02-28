import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

export const AmountField = ({
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
          <FieldLabel>金額</FieldLabel>
          <Input
            type="number"
            min="1"
            placeholder="0"
            {...field}
            value={Number.isNaN(field.value) ? "" : field.value}
            onChange={(e) => field.onChange(e.target.valueAsNumber)}
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
