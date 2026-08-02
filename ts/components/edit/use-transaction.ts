"use client"

import { useMutation } from "@apollo/client/react"
import { useSetAtom } from "jotai/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { CreateTransactionInput, UpdateTransactionInput } from "@/graph/graphql"
import { CreateTransactionDoc, UpdateTransactionDoc } from "./queries"
import { closeModalAtom } from "./state"

type Messages = {
  success: string
  error: string
}

/**
 * 取引の作成 / 更新と、成功後の後始末(トースト・サーバー側の再取得・モーダルを閉じる)。
 * 費用・収入・振替・詳細の 4 フォームで共通の副作用をここに集約する。
 * 入力値 → input への変換は `lib/journal.ts` の純粋関数側にある。
 */
export const useTransaction = () => {
  const [createTransaction, { loading: creating }] = useMutation(CreateTransactionDoc)
  const [updateTransaction, { loading: updating }] = useMutation(UpdateTransactionDoc)
  const close = useSetAtom(closeModalAtom)
  const router = useRouter()

  const run = async (mutate: () => Promise<unknown>, messages: Messages) => {
    try {
      await mutate()
      toast.success(messages.success)
      router.refresh()
      close()
    } catch {
      toast.error(messages.error)
    }
  }

  const create = (input: CreateTransactionInput, messages: Messages) =>
    run(() => createTransaction({ variables: { input } }), messages)

  const update = (input: UpdateTransactionInput, messages: Messages) =>
    run(() => updateTransaction({ variables: { input } }), messages)

  return { create, update, loading: creating || updating }
}
