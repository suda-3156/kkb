import { Controller, type useForm } from "react-hook-form"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// biome-ignore lint/suspicious/noExplicitAny: shared generic helper
type AnyForm = ReturnType<typeof useForm<any>>

type Props = {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  maxLength?: number

  form: AnyForm
  disabled?: boolean
}

export const TextField = ({
  name,
  label,
  placeholder,
  required,
  maxLength,
  form,
  disabled,
}: Props) => {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Input
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            {...field}
            disabled={disabled}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
