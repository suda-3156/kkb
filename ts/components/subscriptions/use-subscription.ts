"use client"

import { useMutation } from "@apollo/client/react"
import { toast } from "sonner"
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from "@/graph/graphql"
import {
  CancelSubscriptionDoc,
  CreateSubscriptionDoc,
  PauseSubscriptionDoc,
  ResumeSubscriptionDoc,
  UncancelSubscriptionDoc,
  UpdateSubscriptionDoc,
} from "./queries"

type Messages = {
  success: string
  error: string
}

/**
 * The six subscription mutations plus their shared side effect (toasts).
 * Dialog opening/closing stays with the callers: a status verb keeps the
 * detail dialog open to show the new state, while create closes its dialog.
 *
 * Every mutation returns the full subscription, so the normalized cache
 * updates rows in place. Only membership changes need a refetch: create adds
 * a row, and cancel/uncancel move a row across the includeCanceled boundary,
 * which the server decides (today > coveredThroughOn), not the cache.
 */
export const useSubscription = () => {
  const membership = { refetchQueries: ["Subscriptions"] }

  const [createSubscription, { loading: creating }] = useMutation(CreateSubscriptionDoc, membership)
  const [updateSubscription, { loading: updating }] = useMutation(UpdateSubscriptionDoc)
  const [pauseSubscription, { loading: pausing }] = useMutation(PauseSubscriptionDoc)
  const [resumeSubscription, { loading: resuming }] = useMutation(ResumeSubscriptionDoc)
  const [cancelSubscription, { loading: canceling }] = useMutation(
    CancelSubscriptionDoc,
    membership,
  )
  const [uncancelSubscription, { loading: uncanceling }] = useMutation(
    UncancelSubscriptionDoc,
    membership,
  )

  const run = async (mutate: () => Promise<unknown>, messages: Messages): Promise<boolean> => {
    try {
      await mutate()
      toast.success(messages.success)
      return true
    } catch {
      toast.error(messages.error)
      return false
    }
  }

  const create = (input: CreateSubscriptionInput, messages: Messages) =>
    run(() => createSubscription({ variables: { input } }), messages)

  const update = (input: UpdateSubscriptionInput, messages: Messages) =>
    run(() => updateSubscription({ variables: { input } }), messages)

  const pause = (id: string) =>
    run(() => pauseSubscription({ variables: { id } }), {
      success: "休止しました",
      error: "休止に失敗しました",
    })

  const resume = (id: string) =>
    run(() => resumeSubscription({ variables: { id } }), {
      success: "再開しました",
      error: "再開に失敗しました",
    })

  const cancel = (id: string) =>
    run(() => cancelSubscription({ variables: { id } }), {
      success: "解約しました",
      error: "解約に失敗しました",
    })

  const uncancel = (id: string) =>
    run(() => uncancelSubscription({ variables: { id } }), {
      success: "解約を取り消しました",
      error: "解約の取り消しに失敗しました",
    })

  return {
    create,
    update,
    pause,
    resume,
    cancel,
    uncancel,
    loading: creating || updating || pausing || resuming || canceling || uncanceling,
  }
}
