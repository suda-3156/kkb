"use client"

import { useQuery } from "@apollo/client/react"
import { useAtomValue, useSetAtom } from "jotai"
import { Plus } from "lucide-react"
import { useState } from "react"
import { LoadingInline } from "@/components/loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { billingDay } from "@/lib/subscriptions"
import { SubscriptionCalendar } from "./calendar"
import { SubscriptionCreateDialog } from "./create-dialog"
import { SubscriptionDetailDialog } from "./detail-dialog"
import { CanceledList, SelectedDayList } from "./list"
import { SubscriptionsDoc } from "./queries"
import { createSubscriptionOpenAtom, selectedDayAtom } from "./state"

/**
 * The subscription management view: one ideal calendar (days 1 to 31, no
 * month navigation), the list for the selected day, and a toggleable canceled
 * section. Everything renders from the single subscriptions query; the
 * dialogs fetch their own detail.
 */
export const SubscriptionsView = () => {
  const [showCanceled, setShowCanceled] = useState(false)
  const openCreate = useSetAtom(createSubscriptionOpenAtom)
  const selectedDay = useAtomValue(selectedDayAtom)

  const { data, loading, error } = useQuery(SubscriptionsDoc, {
    variables: { includeCanceled: showCanceled },
  })

  const subs = data?.subscriptions ?? []
  const activeSubs = subs.filter((sub) => sub.status !== "CANCELED")
  const canceledSubs = subs.filter((sub) => sub.status === "CANCELED")
  const daySubs =
    selectedDay === null ? [] : activeSubs.filter((sub) => billingDay(sub.anchorOn) === selectedDay)

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 p-4 pt-16">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-medium text-muted-foreground text-sm">サブスク</CardTitle>
            <Button size="sm" onClick={() => openCreate(true)}>
              <Plus />
              登録
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingInline />
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center text-destructive">
              データの取得に失敗しました
            </div>
          ) : (
            <>
              <SubscriptionCalendar subs={activeSubs} />
              <div className="mt-2 border-t">
                <SelectedDayList subs={daySubs} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-medium text-muted-foreground text-sm">解約済み</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowCanceled((prev) => !prev)}>
              {showCanceled ? "隠す" : "表示する"}
            </Button>
          </div>
        </CardHeader>
        {showCanceled && (
          <CardContent className="px-3">
            <CanceledList subs={canceledSubs} />
          </CardContent>
        )}
      </Card>

      <SubscriptionDetailDialog />
      <SubscriptionCreateDialog />
    </div>
  )
}
