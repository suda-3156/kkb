"use client"

import { useQuery } from "@apollo/client/react"
import { useAtomValue, useSetAtom } from "jotai"
import { Plus } from "lucide-react"
import { useId, useState } from "react"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { billingDay } from "@/lib/subscriptions"
import { cn } from "@/lib/utils"
import { SubscriptionCalendar } from "./calendar"
import { SubscriptionCreateDialog } from "./create-dialog"
import { SubscriptionDetailDialog } from "./detail-dialog"
import { CanceledList, SelectedDayList } from "./list"
import { SubscriptionsDoc } from "./queries"
import { createSubscriptionOpenAtom, selectedDayAtom } from "./state"

/**
 * The subscription management view: one ideal calendar (days 1 to 31, no
 * month navigation) with the selected day's list below it, and the canceled
 * subscriptions behind one toggle. Everything renders from the single
 * subscriptions query; the dialogs fetch their own detail.
 *
 * The canceled toggle is responsive: from md up it is a switch that slides
 * the canceled list in as a right-hand column next to the calendar; below md
 * it is a button that swaps the whole view between calendar and canceled
 * list. Both drive the same state.
 */
export const SubscriptionsView = () => {
  const [showCanceled, setShowCanceled] = useState(false)
  const openCreate = useSetAtom(createSubscriptionOpenAtom)
  const selectedDay = useAtomValue(selectedDayAtom)
  const switchId = useId()

  const { data, loading, error } = useQuery(SubscriptionsDoc, {
    variables: { includeCanceled: showCanceled },
  })

  const subs = data?.subscriptions ?? []
  const activeSubs = subs.filter((sub) => sub.status !== "CANCELED")
  const canceledSubs = subs.filter((sub) => sub.status === "CANCELED")
  const daySubs =
    selectedDay === null ? [] : activeSubs.filter((sub) => billingDay(sub.anchorOn) === selectedDay)

  return (
    <div className="mx-auto max-w-4xl p-4 pt-16">
      {/* Sub-header: the canceled toggle on the left, create on the right */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <Switch
            id={switchId}
            checked={showCanceled}
            onCheckedChange={(checked) => setShowCanceled(checked)}
          />
          <Label htmlFor={switchId} className="cursor-pointer text-muted-foreground">
            解約済みを表示
          </Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
          onClick={() => setShowCanceled((prev) => !prev)}
        >
          {showCanceled ? "カレンダーへ戻る" : "解約済みを表示"}
        </Button>
        <Button size="sm" onClick={() => openCreate(true)}>
          <Plus />
          登録
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingInline />
        </div>
      ) : error ? (
        <div className="flex h-48 items-center justify-center text-destructive">
          データの取得に失敗しました
        </div>
      ) : (
        <div className={cn(showCanceled && "md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:gap-4")}>
          {/* Below md the canceled view replaces the calendar entirely */}
          <div className={cn(showCanceled && "hidden md:block")}>
            <Card>
              <CardContent>
                <SubscriptionCalendar subs={activeSubs} />
              </CardContent>
            </Card>
            <SelectedDayList subs={daySubs} />
          </div>
          {showCanceled && <CanceledList subs={canceledSubs} />}
        </div>
      )}

      <SubscriptionDetailDialog />
      <SubscriptionCreateDialog />
    </div>
  )
}
