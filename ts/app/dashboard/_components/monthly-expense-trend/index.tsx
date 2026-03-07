import { BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { graphql } from "@/graph"
import type { MonthlyExpenseTrendQuery } from "@/graph/graphql"
import { query } from "@/lib/apollo-client"
import { dateToString } from "@/lib/timeutils"
import { MonthlyExpenseBarChart, type MonthlyExpenseDataPoint } from "./chart"

const MonthlyExpenseTrendDoc = graphql(/* GraphQL */ `
  query MonthlyExpenseTrend($start: Date!, $end: Date!) {
    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {
      dataPoints {
        startDate
        expenses {
          byAccount {
            totalAmount
            ledgerAccount {
              id
              name
            }
          }
        }
      }
    }
  }
`)

export const MonthlyExpenseTrend = async () => {
  const now = new Date()
  const end = dateToString(now)
  const start = dateToString(new Date(now.getFullYear() - 1, now.getMonth(), 1))

  const { data } = await query<MonthlyExpenseTrendQuery>({
    query: MonthlyExpenseTrendDoc,
    variables: { start, end },
  })

  const dataPoints: MonthlyExpenseDataPoint[] = (
    data?.periodAggregationSeries.dataPoints ?? []
  ).map((dp) => ({
    startDate: dp.startDate,
    byAccount: dp.expenses.byAccount.map((a) => ({
      id: a.ledgerAccount.id,
      name: a.ledgerAccount.name,
      totalAmount: a.totalAmount,
    })),
  }))

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <BarChart3 className="h-4 w-4" />
          月次支出推移
        </CardTitle>
        <CardDescription>直近12ヶ月</CardDescription>
      </CardHeader>
      <CardContent>
        {dataPoints.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">データがありません</p>
        ) : (
          <MonthlyExpenseBarChart dataPoints={dataPoints} />
        )}
      </CardContent>
    </Card>
  )
}
