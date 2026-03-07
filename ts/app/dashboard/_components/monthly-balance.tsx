import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { graphql } from "@/graph"
import type { MonthlyBalanceQuery } from "@/graph/graphql"
import { query } from "@/lib/apollo-client"
import { thisMonthString } from "@/lib/timeutils"

const MonthlyBalanceDoc = graphql(/* GraphQL */ `
  query MonthlyBalance($start: Date!, $end: Date!) {
    periodAggregation(startDate: $start, endDate: $end) {
      expenses { totalAmount }
      revenue { totalAmount }
      netAmount
    }
  }
`)

export const MonthlyBalance = async () => {
  const { start, end } = thisMonthString()

  const { data } = await query<MonthlyBalanceQuery>({
    query: MonthlyBalanceDoc,
    variables: { start, end },
  })

  const expenses = data?.periodAggregation?.expenses?.totalAmount ?? 0
  const revenue = data?.periodAggregation?.revenue?.totalAmount ?? 0
  const net = data?.periodAggregation?.netAmount ?? 0

  const now = new Date()
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <Wallet className="h-4 w-4" />
          今月の収支
        </CardTitle>
        <CardDescription>{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm dark:text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
            収入
          </div>
          <span className="font-semibold tabular-nums">¥{revenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-rose-500 text-sm">
            <ArrowDownRight className="h-4 w-4" />
            支出
          </div>
          <span className="font-semibold text-rose-500 tabular-nums">
            ¥{expenses.toLocaleString()}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">純額</span>
          <span
            className={`font-bold text-xl tabular-nums ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}
          >
            {net >= 0 ? "+" : "−"}¥{Math.abs(net).toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
