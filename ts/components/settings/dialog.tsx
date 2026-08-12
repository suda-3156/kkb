"use client"

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useId } from "react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import * as ResponsiveDialog from "@/components/ui/responsive-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AccountOrder } from "@/lib/settings"
import { settingsAtom, settingsOpenAtom, updateSettingsAtom } from "./state"

const accountOrderItems: { label: string; value: AccountOrder; description: string }[] = [
  { label: "作成順", value: "created", description: "科目を作った順に並べます。" },
  { label: "最近使った順", value: "lastUsed", description: "直近で使った科目を上に並べます。" },
]

export const SettingsDialog = () => {
  const [open, setOpen] = useAtom(settingsOpenAtom)

  return (
    <ResponsiveDialog.Container open={open} onOpenChange={setOpen}>
      <ResponsiveDialog.Content className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <ResponsiveDialog.Header>
          <span className="font-semibold">設定</span>
        </ResponsiveDialog.Header>

        <div className="space-y-6 px-3 pb-4">
          <AccountOrderSetting />
        </div>
      </ResponsiveDialog.Content>
    </ResponsiveDialog.Container>
  )
}

const AccountOrderSetting = () => {
  const settings = useAtomValue(settingsAtom)
  const update = useSetAtom(updateSettingsAtom)
  const id = useId()

  return (
    <Field>
      <FieldLabel htmlFor={id}>勘定科目の並び順</FieldLabel>
      <Select
        items={accountOrderItems}
        value={settings.accountOrder}
        onValueChange={(value: string | null) =>
          update({ accountOrder: (value ?? "created") as AccountOrder })
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accountOrderItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        {accountOrderItems.find((item) => item.value === settings.accountOrder)?.description}
      </FieldDescription>
    </Field>
  )
}
