"use client"

import { useAtom } from "jotai"
import * as ResponsiveDialog from "@/components/ui/responsive-dialog"
import type { SubscriptionFormValues } from "@/lib/schema"
import { todayString } from "@/lib/timeutils"
import { buildTemplateEntries, SubscriptionForm } from "./form"
import { createSubscriptionOpenAtom } from "./state"
import { useSubscription } from "./use-subscription"

export const SubscriptionCreateDialog = () => {
  const [open, setOpen] = useAtom(createSubscriptionOpenAtom)
  const { create, loading } = useSubscription()

  const defaultValues: SubscriptionFormValues = {
    name: "",
    registeredOn: todayString(),
    intervalMonths: 1,
    color: null,
    amount: Number.NaN,
    categoryId: "",
    paymentId: "",
  }

  const onSubmit = async (values: SubscriptionFormValues) => {
    // Registered today = billed today: the server materializes the first
    // occurrence immediately instead of waiting for tomorrow's job run.
    const ok = await create(
      {
        name: values.name,
        registeredOn: values.registeredOn,
        intervalMonths: values.intervalMonths,
        color: values.color ?? undefined,
        entries: buildTemplateEntries(values),
      },
      { success: "登録しました", error: "登録に失敗しました" },
    )
    if (ok) setOpen(false)
  }

  return (
    <ResponsiveDialog.Container open={open} onOpenChange={setOpen}>
      <ResponsiveDialog.Content className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <ResponsiveDialog.Header>
          <span className="font-medium text-lg">サブスクを登録</span>
        </ResponsiveDialog.Header>
        <SubscriptionForm
          defaultValues={defaultValues}
          submitLabel="登録"
          loading={loading}
          onSubmit={onSubmit}
        />
      </ResponsiveDialog.Content>
    </ResponsiveDialog.Container>
  )
}
