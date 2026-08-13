"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { debitTotal, intervalLabel, monthDayLabel, STATUS_LABELS } from "@/lib/subscriptions"
import { cn } from "@/lib/utils"
import type { SubscriptionItem } from "./calendar"
import { detailSubscriptionIdAtom, selectedDayAtom } from "./state"

const StatusBadge = ({ status }: { status: SubscriptionItem["status"] }) => (
  <span
    className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", {
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400": status === "ACTIVE",
      "bg-muted text-muted-foreground": status === "PAUSED",
      "bg-rose-500/10 text-rose-500": status === "CANCELED",
    })}
  >
    {STATUS_LABELS[status]}
  </span>
)

const SubscriptionRow = ({ sub }: { sub: SubscriptionItem }) => {
  const openDetail = useSetAtom(detailSubscriptionIdAtom)

  return (
    <button
      type="button"
      onClick={() => openDetail(sub.id)}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60",
        sub.status === "CANCELED" && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-sm">{sub.name}</p>
        <p className="text-muted-foreground text-xs">
          {intervalLabel(sub.intervalMonths)}
          {sub.status !== "CANCELED" && <> ・ 次回 {monthDayLabel(sub.nextOccurrenceOn)}</>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold text-sm tabular-nums">
          ¥{debitTotal(sub.templateEntries).toLocaleString()}
        </span>
        <StatusBadge status={sub.status} />
      </div>
    </button>
  )
}

/** The subscriptions billing on the day selected in the ideal calendar. */
export const SelectedDayList = ({ subs }: { subs: SubscriptionItem[] }) => {
  const selectedDay = useAtomValue(selectedDayAtom)

  if (selectedDay === null) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        日付を選ぶと、その日に支払いのあるサブスクが表示されます
      </p>
    )
  }

  if (subs.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        {selectedDay}日に支払いのあるサブスクはありません
      </p>
    )
  }

  return (
    <div>
      <h3 className="px-3 pt-2 font-medium text-muted-foreground text-xs">
        {selectedDay}日の支払い
      </h3>
      <div className="divide-y">
        {subs.map((sub) => (
          <SubscriptionRow key={sub.id} sub={sub} />
        ))}
      </div>
    </div>
  )
}

/** Canceled subscriptions, revealed by the toggle. The row opens the detail
 * dialog, where 解約の取り消し lives. */
export const CanceledList = ({ subs }: { subs: SubscriptionItem[] }) => {
  if (subs.length === 0) {
    return <p className="py-4 text-center text-muted-foreground text-sm">解約済みはありません</p>
  }

  return (
    <div className="divide-y">
      {subs.map((sub) => (
        <SubscriptionRow key={sub.id} sub={sub} />
      ))}
    </div>
  )
}
