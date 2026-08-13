"use client"

import { useQuery } from "@apollo/client/react"
import { useAtom } from "jotai"
import { useState } from "react"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import * as ResponsiveDialog from "@/components/ui/responsive-dialog"
import { Separator } from "@/components/ui/separator"
import type { SubscriptionDetailQuery } from "@/graph/graphql"
import type { SubscriptionFormValues } from "@/lib/schema"
import {
  debitTotal,
  intervalLabel,
  monthDayLabel,
  occurrenceDisplay,
  STATUS_LABELS,
} from "@/lib/subscriptions"
import { cn } from "@/lib/utils"
import { buildTemplateEntries, SubscriptionForm } from "./form"
import { SubscriptionDetailDoc } from "./queries"
import { detailSubscriptionIdAtom } from "./state"
import { useSubscription } from "./use-subscription"

type SubscriptionDetail = NonNullable<SubscriptionDetailQuery["subscription"]>

export const SubscriptionDetailDialog = () => {
  const [subId, setSubId] = useAtom(detailSubscriptionIdAtom)

  const { data, loading, error } = useQuery(SubscriptionDetailDoc, {
    skip: !subId,
    variables: { id: subId ?? "" },
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) setSubId(null)
  }

  const sub = data?.subscription

  return (
    <ResponsiveDialog.Container open={subId !== null} onOpenChange={handleOpenChange}>
      <ResponsiveDialog.Content className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {loading || !subId ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingInline />
          </div>
        ) : error || !sub ? (
          <div className="flex h-48 items-center justify-center text-destructive">
            データの取得に失敗しました
          </div>
        ) : (
          <DetailBody sub={sub} />
        )}
      </ResponsiveDialog.Content>
    </ResponsiveDialog.Container>
  )
}

const DetailBody = ({ sub }: { sub: SubscriptionDetail }) => {
  const { update, pause, resume, cancel, uncancel, loading } = useSubscription()
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  // 有効期限 means "paid through" only after something was actually paid; the
  // initialized value on a never-materialized subscription is hidden (spec 3.4).
  const hasMaterialized = sub.occurrences.some((occ) => occ.outcome === "MATERIALIZED")

  const debitEntry = sub.templateEntries.find((entry) => entry.kind === "DEBIT")
  const creditEntry = sub.templateEntries.find((entry) => entry.kind === "CREDIT")

  const defaultValues: SubscriptionFormValues = {
    name: sub.name,
    registeredOn: sub.registeredOn,
    intervalMonths: sub.intervalMonths,
    amount: debitTotal(sub.templateEntries),
    categoryId: debitEntry?.ledgerAccount.id ?? "",
    paymentId: creditEntry?.ledgerAccount.id ?? "",
  }

  const onSubmit = (values: SubscriptionFormValues) =>
    update(
      {
        id: sub.id,
        name: values.name,
        registeredOn: values.registeredOn,
        intervalMonths: values.intervalMonths,
        entries: buildTemplateEntries(values),
        updatedAt: sub.updatedAt,
      },
      { success: "更新しました", error: "更新に失敗しました" },
    )

  return (
    <div className="space-y-4">
      <ResponsiveDialog.Header>
        <div className="flex w-full items-center justify-between gap-2 pr-8">
          <span className="truncate font-medium text-lg">{sub.name}</span>
          <span className="shrink-0 text-muted-foreground text-sm">
            {STATUS_LABELS[sub.status]}
          </span>
        </div>
      </ResponsiveDialog.Header>

      {/* Schedule facts the form does not carry */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 text-muted-foreground text-sm">
        {sub.status !== "CANCELED" && <span>次回 {monthDayLabel(sub.nextOccurrenceOn)}</span>}
        {hasMaterialized && <span>有効期限 {sub.coveredThroughOn}</span>}
        <span>{intervalLabel(sub.intervalMonths)}</span>
      </div>

      {/* Status verbs (spec 3.3): pause is a plain toggle, cancel confirms. */}
      <div className="flex flex-wrap gap-2 px-3">
        {sub.status === "ACTIVE" && (
          <Button variant="outline" size="sm" disabled={loading} onClick={() => pause(sub.id)}>
            休止する
          </Button>
        )}
        {sub.status === "PAUSED" && (
          <Button variant="outline" size="sm" disabled={loading} onClick={() => resume(sub.id)}>
            再開する
          </Button>
        )}
        {sub.status !== "CANCELED" && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            className="text-destructive"
            onClick={() => setConfirmingCancel(true)}
          >
            解約する
          </Button>
        )}
        {sub.status === "CANCELED" && (
          <Button variant="outline" size="sm" disabled={loading} onClick={() => uncancel(sub.id)}>
            解約を取り消す
          </Button>
        )}
      </div>

      <Separator />

      <SubscriptionForm
        defaultValues={defaultValues}
        submitLabel="保存"
        loading={loading}
        onSubmit={onSubmit}
      />

      <Separator />

      <PaymentHistory occurrences={sub.occurrences} />

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="このサブスクを解約しますか?"
        description={`${sub.name} — 有効期限まで使えたあと、自動入力が止まります。解約は取り消せます。`}
        confirmLabel="解約する"
        destructive
        loading={loading}
        onConfirm={async () => {
          await cancel(sub.id)
          setConfirmingCancel(false)
        }}
      />
    </div>
  )
}

/**
 * Payment history straight from the materialization log (newest first, the
 * server's order). A materialized occurrence whose transaction is gone was
 * auto-entered and then deleted by hand; the row stays and says so.
 */
const PaymentHistory = ({ occurrences }: { occurrences: SubscriptionDetail["occurrences"] }) => {
  if (occurrences.length === 0) {
    return (
      <p className="px-3 pb-2 text-center text-muted-foreground text-sm">
        支払い履歴はまだありません
      </p>
    )
  }

  return (
    <div className="px-3 pb-2">
      <h3 className="pb-1 font-medium text-muted-foreground text-xs">支払い履歴</h3>
      <div className="max-h-64 divide-y overflow-y-auto">
        {occurrences.map((occ) => {
          const display = occurrenceDisplay(occ.outcome, occ.transaction != null)

          return (
            <div
              key={occ.occurrenceOn}
              className={cn(
                "flex items-center justify-between gap-2 py-2 text-sm",
                display === "skipped" && "text-muted-foreground",
              )}
            >
              <span className="tabular-nums">{occ.occurrenceOn}</span>
              {display === "materialized" && occ.transaction && (
                <span className="tabular-nums">
                  ¥{debitTotal(occ.transaction.entries).toLocaleString()}
                </span>
              )}
              {display === "deleted" && (
                <span className="text-muted-foreground line-through">削除済み</span>
              )}
              {display === "skipped" && <span>スキップ</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
