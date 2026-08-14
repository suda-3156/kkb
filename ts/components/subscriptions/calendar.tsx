"use client"

import { useAtom, useSetAtom } from "jotai"
import type { SubscriptionsQuery } from "@/graph/graphql"
import {
  COLOR_CLASSES,
  debitTotal,
  groupByBillingDay,
  IDEAL_CALENDAR_DAYS,
  intervalLabel,
  monthDayLabel,
  resolveColor,
} from "@/lib/subscriptions"
import { cn } from "@/lib/utils"
import { detailSubscriptionIdAtom, selectedDayAtom } from "./state"

export type SubscriptionItem = SubscriptionsQuery["subscriptions"][number]

/**
 * The ideal calendar: a fixed month of days 1 to 31, no weekdays and no month
 * navigation. A subscription sits on its billing day-of-month (the anchor's
 * day, so a month-end subscription stays on 31 even when February bills it on
 * 28). Canceled subscriptions never bill again and are left off entirely.
 *
 * Interactions: tapping a cell selects the day (the list below the calendar
 * follows), which is the only interaction on mobile where the chips are dots.
 * From sm up the chips are labeled and clicking one opens the detail dialog
 * directly.
 */
export const SubscriptionCalendar = ({ subs }: { subs: SubscriptionItem[] }) => {
  const [selectedDay, setSelectedDay] = useAtom(selectedDayAtom)
  const openDetail = useSetAtom(detailSubscriptionIdAtom)

  const byDay = groupByBillingDay(subs)

  return (
    <div className="grid grid-cols-7 gap-1">
      {IDEAL_CALENDAR_DAYS.map((day) => {
        const daySubs = byDay.get(day) ?? []
        const selected = selectedDay === day

        return (
          // The whole cell is the day-selection target; the chips inside stop
          // propagation to open the detail directly. Nesting buttons is
          // invalid HTML, so the cell is a div with button semantics.
          // biome-ignore lint/a11y/useSemanticElements: the chips inside are buttons, which cannot nest in a button
          <div
            key={day}
            role="button"
            tabIndex={0}
            aria-label={`${day}日の支払いを見る`}
            aria-pressed={selected}
            onClick={() => setSelectedDay(selected ? null : day)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                setSelectedDay(selected ? null : day)
              }
            }}
            className={cn(
              "flex min-h-14 cursor-pointer flex-col gap-0.5 rounded-md border border-transparent p-1 transition-colors hover:bg-muted/60 sm:min-h-20",
              selected && "border-ring bg-muted/60",
            )}
          >
            <span className="text-muted-foreground text-xs tabular-nums">{day}</span>

            {/* Mobile: dots only. A paused subscription goes gray regardless
                of its color, since "will be skipped" outranks identity. */}
            <div className="flex flex-wrap gap-0.5 sm:hidden">
              {daySubs.map((sub) => (
                <span
                  key={sub.id}
                  className={cn(
                    "size-1.5 rounded-full",
                    sub.status === "PAUSED"
                      ? "bg-muted-foreground/40"
                      : COLOR_CLASSES[resolveColor(sub.color, sub.id)].dot,
                  )}
                />
              ))}
            </div>

            {/* sm+: labeled chips, directly clickable */}
            <div className="hidden flex-col gap-0.5 sm:flex">
              {daySubs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDetail(sub.id)
                  }}
                  title={`${sub.name} ¥${debitTotal(sub.templateEntries).toLocaleString()} ${intervalLabel(sub.intervalMonths)} 次回 ${monthDayLabel(sub.nextOccurrenceOn)}`}
                  className={cn(
                    "cursor-pointer truncate rounded px-1 py-0.5 text-left text-xs transition-colors",
                    sub.status === "PAUSED"
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : COLOR_CLASSES[resolveColor(sub.color, sub.id)].chip,
                  )}
                >
                  <span className="truncate">{sub.name}</span>{" "}
                  <span className="tabular-nums">
                    ¥{debitTotal(sub.templateEntries).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
