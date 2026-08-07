"use client"

import type { ApolloCache } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { useSetAtom } from "jotai/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { CreateTransactionInput, UpdateTransactionInput } from "@/graph/graphql"
import { bumpLastUsed, type LastUsedFields } from "@/lib/lac-options"
import {
  CreateTransactionDoc,
  DeleteTransactionDoc,
  LedgerAccountLastUsedFragment,
  UpdateTransactionDoc,
} from "./queries"
import { closeModalAtom } from "./state"

type Messages = {
  success: string
  error: string
}

/** 直近利用の書き戻しに要るぶんだけの、mutation の返り値の形。 */
type RecordedTransaction = {
  date: string
  createdAt: string
  entries: { ledgerAccount: { id: string } }[]
}

/**
 * 記録した取引に出てくる科目の直近利用を、キャッシュ上で進める。
 *
 * これが無いと、いま入力した科目が「最近使った順」の先頭に来るのはページを
 * 読み直した後になる。取引日・記録時刻・科目はどれも mutation の返り値にある
 * ので、サーバへ取りに戻る必要はない。
 *
 * 科目を**外した**取引を更新した場合、外された側の直近利用は下がりうるが、それは
 * 手元の情報からは決められない(その科目の他の取引を知らない)。下げずに放置し、
 * 次の再取得で合わせる。並びが少し古いだけで、壊れはしない。
 */
const bumpAccountsLastUsed = (cache: ApolloCache, transaction: RecordedTransaction) => {
  for (const entry of transaction.entries) {
    const id = cache.identify({ __typename: "LedgerAccount", id: entry.ledgerAccount.id })
    if (!id) continue

    const current = cache.readFragment<LastUsedFields>({
      id,
      fragment: LedgerAccountLastUsedFragment,
    })

    const next = bumpLastUsed(current, {
      date: transaction.date,
      recordedAt: transaction.createdAt,
    })
    if (!next) continue

    cache.writeFragment({
      id,
      fragment: LedgerAccountLastUsedFragment,
      data: { __typename: "LedgerAccount", id: entry.ledgerAccount.id, ...next },
    })
  }
}

/**
 * 取引の作成 / 更新 / 削除と、成功後の後始末(トースト・サーバー側の再取得・モーダルを閉じる)。
 * 費用・収入・振替・詳細の 4 フォームと、ダッシュボードの取引一覧で共通の副作用をここに集約する。
 * 入力値 → input への変換は `lib/journal.ts` の純粋関数側にある。
 */
export const useTransaction = () => {
  const [createTransaction, { loading: creating }] = useMutation(CreateTransactionDoc, {
    update: (cache, { data }) => {
      if (data?.createTransaction) bumpAccountsLastUsed(cache, data.createTransaction)
    },
  })
  const [updateTransaction, { loading: updating }] = useMutation(UpdateTransactionDoc, {
    update: (cache, { data }) => {
      if (data?.updateTransaction) bumpAccountsLastUsed(cache, data.updateTransaction)
    },
  })
  const [deleteTransaction, { loading: deleting }] = useMutation(DeleteTransactionDoc)
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

  // 物理削除。呼び出し側で必ず確認を挟む(ConfirmDialog)。
  // 一覧から削除したときはモーダルが開いていないが、close は no-op なので害はない。
  const remove = (id: string, messages: Messages) =>
    run(() => deleteTransaction({ variables: { id } }), messages)

  return { create, update, remove, loading: creating || updating || deleting }
}
