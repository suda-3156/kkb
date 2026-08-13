"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import {
  AmountField,
  DateField,
  SelectLedgerAccountField,
  TextField,
} from "@/components/edit/fields"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type SubscriptionFormValues, subscriptionSchema } from "@/lib/schema"

// The interval is entered as one of three shapes; custom opens a 1..12 dial.
// The form value stays a plain number, so 12 entered through "custom" reopens
// as "yearly" - same meaning, no information lost.
type IntervalMode = "monthly" | "yearly" | "custom"

const modeOf = (intervalMonths: number): IntervalMode => {
  if (intervalMonths === 1) return "monthly"
  if (intervalMonths === 12) return "yearly"
  return "custom"
}

const MODE_ITEMS: { label: string; value: IntervalMode }[] = [
  { label: "毎月", value: "monthly" },
  { label: "年払い", value: "yearly" },
  { label: "カスタム", value: "custom" },
]

const MONTH_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}か月ごと`,
  value: String(i + 1),
}))

type Props = {
  defaultValues: SubscriptionFormValues
  submitLabel: string
  loading: boolean
  onSubmit: (values: SubscriptionFormValues) => void
}

export const SubscriptionForm = ({ defaultValues, submitLabel, loading, onSubmit }: Props) => {
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues,
  })

  const [mode, setMode] = useState<IntervalMode>(modeOf(defaultValues.intervalMonths))

  const handleModeChange = (value: string | null) => {
    const next = (value as IntervalMode | null) ?? "monthly"
    setMode(next)
    if (next === "monthly") form.setValue("intervalMonths", 1)
    if (next === "yearly") form.setValue("intervalMonths", 12)
    // custom keeps the current number; the dial below takes over
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="relative w-full space-y-4 overflow-hidden px-3"
    >
      <TextField
        name="name"
        form={form}
        label="名前"
        maxLength={200}
        placeholder="サービス名を入力"
      />

      <div className="grid grid-cols-2 gap-4">
        <DateField name="registeredOn" form={form} label="登録日" />
        <AmountField name="amount" form={form} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>周期</FieldLabel>
          <Select items={MODE_ITEMS} value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {mode === "custom" && (
          <Field>
            <FieldLabel>何か月ごと</FieldLabel>
            <Select
              items={MONTH_ITEMS}
              value={String(form.watch("intervalMonths"))}
              onValueChange={(value: string | null) => {
                form.setValue("intervalMonths", Number(value ?? 1))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <SelectLedgerAccountField form={form} label="費用科目" name="categoryId" kind="EXPENSE" />

      <SelectLedgerAccountField
        form={form}
        label="支払い方法"
        name="paymentId"
        kind={["ASSET", "LIABILITY"]}
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? <LoadingInline text="送信中..." /> : submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** Turn the form values into the 2-entry template every mutation sends. */
export const buildTemplateEntries = (values: SubscriptionFormValues) => [
  { ledgerAccountId: values.categoryId, amount: values.amount, kind: "DEBIT" as const },
  { ledgerAccountId: values.paymentId, amount: values.amount, kind: "CREDIT" as const },
]
