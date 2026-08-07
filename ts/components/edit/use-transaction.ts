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

/** Just enough of the mutation result to write the last use back. */
type RecordedTransaction = {
  date: string
  createdAt: string
  entries: { ledgerAccount: { id: string } }[]
}

/**
 * Advance, in the cache, the last use of every account in the recorded transaction.
 *
 * Without this, an account just used only reaches the top of the most-recently-used
 * ordering after a reload. The date, the recorded time and the accounts all come back
 * in the mutation result, so there is nothing to fetch.
 *
 * When an update **removes** an account, that account's last use may need to drop -
 * but nothing here can decide by how much, since the other transactions using it are
 * unknown. Leave it alone and let the next fetch settle it: the ordering goes
 * slightly stale, it does not break.
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
 * Creating, updating and deleting a transaction, plus the cleanup that follows a
 * success: toast, server-side refetch, close the modal. The four forms (expense,
 * revenue, transfer, detailed) and the dashboard list share these side effects.
 * Turning form values into the input lives in the pure functions of `lib/journal.ts`.
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

  // A hard delete. Callers must confirm first (ConfirmDialog).
  // Deleting from the list happens with no modal open, but close is a no-op there.
  const remove = (id: string, messages: Messages) =>
    run(() => deleteTransaction({ variables: { id } }), messages)

  return { create, update, remove, loading: creating || updating || deleting }
}
