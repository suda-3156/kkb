"use client"
import { useQuery } from "@apollo/client/react"
import type { SelectRootChangeEventDetails } from "@base-ui/react/select"
import { useAtomValue, useSetAtom } from "jotai"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { graphql } from "@/graph"
import type { GetTransactionForModalQuery } from "@/graph/graphql"
import { LoadingInline } from "../loading"
import { closeModalAtom, type ModalView, modalStateAtom, openModalAtom } from "./state"
import { ExpenseForm, LedgerAccountForm, RevenueForm, TransactionForm, TransferForm } from "./view"
import * as EditWrapper from "./wrapper"

const GetTransactionDoc = graphql(/* GraphQL */ `
  query GetTransactionForModal($id: ID!) {
    transaction(id: $id) {
      id
      date
      description
      updatedAt
      entries {
        ledgerAccount {
          id
          name
          kind
        }
        amount
        kind
      }
    }
  }
`)

const viewMap = (view: string, data?: GetTransactionForModalQuery) => {
  switch (view) {
    case "expense":
      return <ExpenseForm />
    case "revenue":
      return <RevenueForm />
    case "transfer":
      return <TransferForm />
    case "txn":
      return <TransactionForm data={data} />
    case "lac":
      return <LedgerAccountForm />
    default:
      return null
  }
}

export const EditModal = () => {
  const state = useAtomValue(modalStateAtom)
  const close = useSetAtom(closeModalAtom)

  const { data, loading, error } = useQuery(GetTransactionDoc, {
    skip: !state.txnId,
    variables: { id: state.txnId ?? "" },
  })

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

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingInline />
          </div>
        ) : error ? (
          <div className="flex h-48 items-center justify-center text-destructive">
            データの取得に失敗しました
          </div>
        ) : (
          viewMap(state.view ?? "fallback", data)
        )}
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

  const handleValueChange = (value: string | null, _: SelectRootChangeEventDetails) => {
    open(value ? (value as ModalView) : "expense")
  }

  return (
    <Select
      items={items}
      onValueChange={handleValueChange}
      value={state.view ? state.view : "fallback"}
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
