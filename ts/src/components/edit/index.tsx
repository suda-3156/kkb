"use client"
import type { SelectRootChangeEventDetails } from "@base-ui/react/select"
import { useAtomValue, useSetAtom } from "jotai"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { closeModalAtom, type ModalView, modalStateAtom, openModalAtom } from "./state"
import { ExpenseForm, RevenueForm, TransferForm } from "./view"
import * as EditWrapper from "./wrapper"

const viewMap: Record<ModalView, React.ReactNode> = {
  fallback: <div>fallback</div>,
  expense: <ExpenseForm />,
  revenue: <RevenueForm />,
  transfer: <TransferForm />,
  txn: <div>Transaction Form</div>,
  lac: <div>Ledger Account Form</div>,
}

export const EditModal = () => {
  const state = useAtomValue(modalStateAtom)
  const close = useSetAtom(closeModalAtom)

  const handleOpenChange = (open: boolean) => {
    if (!open) close()
  }

  return (
    <EditWrapper.Container open={state.open} onOpenChange={handleOpenChange}>
      <EditWrapper.Content
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={false}
      >
        <EditWrapper.Header>
          <SelectView />
        </EditWrapper.Header>

        {state.open && state.view ? viewMap[state.view] : null}
      </EditWrapper.Content>
    </EditWrapper.Container>
  )
}

const items: { label: string; value: ModalView }[] = [
  { label: "支出", value: "expense" },
  { label: "収入", value: "revenue" },
  { label: "振替", value: "transfer" },
  { label: "取引", value: "txn" },
  { label: "勘定科目", value: "lac" },
]

const SelectView = () => {
  const open = useSetAtom(openModalAtom)
  const state = useAtomValue(modalStateAtom)

  const handleValueChange = (value: ModalView | null, _: SelectRootChangeEventDetails) => {
    open(value ? value : "fallback")
  }

  return (
    <Select
      items={items}
      onValueChange={handleValueChange}
      value={state.open && state.view ? state.view : "fallback"}
    >
      <SelectTrigger className="ml-auto w-48">
        <SelectValue placeholder="Select a view" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
