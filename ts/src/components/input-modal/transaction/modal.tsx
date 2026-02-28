"use client"

import { useQuery } from "@apollo/client/react"
import { useAtom, useSetAtom } from "jotai"
import { ErrorInline } from "@/components/error"
import { LoadingInline } from "@/components/loading"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { graphql } from "@/graph"
import { closeTransactionModalAtom, transactionModalAtom } from "./state"
import { ExpenseForm } from "./tabs/expense"
import { RevenueForm } from "./tabs/revenue"
import { TransactionForm } from "./tabs/transaction"
import { TransferForm } from "./tabs/transfer"

const GetTransactionForModal = graphql(/* GraphQL */ `
  query GetTransactionForModal($id: ID!) {
    transaction(id: $id) {
      id
      date
      description
      updatedAt
      entries {
        id
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

export const TransactionModal = () => {
  const [state] = useAtom(transactionModalAtom)
  const close = useSetAtom(closeTransactionModalAtom)

  const isEdit = state.open && state.mode === "edit"
  const transactionId = isEdit ? state.transactionId : undefined

  const { data, loading, error } = useQuery(GetTransactionForModal, {
    skip: !transactionId,
    variables: { id: transactionId ?? "" },
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) close()
  }

  const dialogTitle = isEdit ? "取引を編集" : "取引を記録"

  return (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {/* 編集モード */}
        {state.open && state.mode === "edit" && loading && (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingInline />
          </div>
        )}
        {state.open && state.mode === "edit" && !loading && data?.transaction && (
          <TransactionForm onSuccess={close} initialData={data?.transaction ?? undefined} />
        )}
        {state.open && state.mode === "edit" && (error || !data?.transaction) && (
          <div className="flex h-full w-full items-center justify-center">
            <ErrorInline message="取引の情報の取得に失敗しました" />
          </div>
        )}

        {/* 新規作成モード */}
        {state.open && state.mode === "create" && (
          <Tabs defaultValue={state.tab}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                支出
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex-1">
                収入
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1">
                振替
              </TabsTrigger>
              <TabsTrigger value="transaction" className="flex-1">
                取引
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense">
              <ExpenseForm onSuccess={close} />
            </TabsContent>
            <TabsContent value="revenue">
              <RevenueForm onSuccess={close} />
            </TabsContent>
            <TabsContent value="transfer">
              <TransferForm onSuccess={close} />
            </TabsContent>
            <TabsContent value="transaction">
              <TransactionForm onSuccess={close} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
