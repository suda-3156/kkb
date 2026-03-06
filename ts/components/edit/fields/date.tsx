import { CalendarIcon } from "lucide-react"
import { Controller, type useForm } from "react-hook-form"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { dateToString, stringToDate, todayString } from "@/lib/timeutils"

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
      defaultValue={todayString()}
      render={({ field, fieldState }) => {
        const selected = field.value ? stringToDate(field.value) : undefined
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>日付</FieldLabel>
            <div className="relative">
              <Input placeholder="YYYY-MM-DD" {...field} disabled={disabled} />
              <Popover>
                <PopoverTrigger
                  className="absolute top-0 right-2 bottom-0 my-auto"
                  disabled={disabled}
                  aria-invalid={fieldState.invalid || undefined}
                >
                  <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => field.onChange(date ? dateToString(date) : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )
      }}
    />
  )
}
