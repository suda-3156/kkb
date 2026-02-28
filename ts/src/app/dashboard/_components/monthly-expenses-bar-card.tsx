"use client"

import { useQuery } from "@apollo/client/react/compiled"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ErrorCard } from "@/components/cards/error-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { graphql } from "@/graph"
import type { MonthlyExpensesSeriesQuery } from "@/graph/graphql"
import { formatYen } from "@/lib/numutils"
import { dateStr } from "@/lib/timeutils"

const MonthlyExpensesSeries = graphql(/* GraphQL */ `
  query MonthlyExpensesSeries($start: Date!, $end: Date!) {
    periodAggregationSeries(startDate: $start, endDate: $end, granularity: MONTHLY) {
      dataPoints {
        startDate
        expenses {
          totalAmount
        }
      }
    }
  }
`)

const chartConfig = {
  amount: { label: "支出", color: "var(--chart-1)" },
} satisfies ChartConfig

// Latest 1 year
const getDateRange = (now: Date): { start: string; end: string; label: string } => {
  const end = dateStr(now)
  const start = dateStr(new Date(now.getFullYear() - 1, now.getMonth(), 1))
  return { start, end, label: "直近1年" }
}

export const MonthlyExpensesBarCard = () => {
  const now = new Date()
  const { start, end, label } = getDateRange(now)

  const { data, loading, error } = useQuery<MonthlyExpensesSeriesQuery>(MonthlyExpensesSeries, {
    variables: { start, end },
  })

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorCard message={error.message} className="w-full max-w-100" />
  }

  const dataPoints = data?.periodAggregationSeries.dataPoints ?? []

  const chartData = dataPoints.map((dp) => {
    const date = new Date(dp.startDate)
    return {
      month: `${date.getMonth() + 1}月`,
      amount: dp.expenses.totalAmount,
    }
  })

  return (
    <Card className="w-full max-w-100">
      <CardHeader>
        <CardTitle className="font-medium text-sm">{label}の月別支出</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => (v === 0 ? "0" : `¥${(v / 10000).toFixed(0)}万`)}
              width={52}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <span className="font-medium">{payload[0].payload.month}</span>
                    <span className="ml-2 text-muted-foreground tabular-nums">
                      {formatYen(payload[0].value as number)}
                    </span>
                  </div>
                )
              }}
            />
            <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const Loading = () => (
  <Card className="w-full max-w-100">
    <CardHeader>
      <CardTitle className="font-medium text-sm">月別支出</CardTitle>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-56 w-full" />
    </CardContent>
  </Card>
)
