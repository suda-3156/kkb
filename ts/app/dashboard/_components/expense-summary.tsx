import { TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { graphql } from "@/graph"
import type { ExpenseSummaryQuery } from "@/graph/graphql"
import { query } from "@/lib/apollo-client"
import { thisMonthString, thisWeekString, thisYearString } from "@/lib/timeutils"

const ExpenseSummaryDoc = graphql(/* GraphQL */ `
  query ExpenseSummary (
    $weekStart: Date!, $weekEnd: Date!
    $monthStart: Date!, $monthEnd: Date!
    $yearStart: Date!, $yearEnd: Date!
  ) {
    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }
    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }
    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }
  }
`)

export const ExpenseSummary = async () => {
  const week = thisWeekString()
  const month = thisMonthString()
  const year = thisYearString()

  const { data } = await query<ExpenseSummaryQuery>({
    query: ExpenseSummaryDoc,
    variables: {
      weekStart: week.start,
      weekEnd: week.end,
      monthStart: month.start,
      monthEnd: month.end,
      yearStart: year.start,
      yearEnd: year.end,
    },
  })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <TrendingDown className="h-4 w-4" />
          支出サマリー
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">今週</span>
          <span className="font-bold text-4xl tabular-nums md:text-5xl">
            ¥{data?.thisWeek?.expenses?.totalAmount?.toLocaleString() ?? "0"}
          </span>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">今月</span>
          <span className="font-semibold text-3xl tabular-nums">
            ¥{data?.thisMonth?.expenses?.totalAmount?.toLocaleString() ?? "0"}
          </span>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">今年</span>
          <span className="font-semibold text-2xl text-muted-foreground tabular-nums">
            ¥{data?.thisYear?.expenses?.totalAmount?.toLocaleString() ?? "0"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
