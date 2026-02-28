"use client"

import { useQuery } from "@apollo/client/react/compiled"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ErrorCard } from "@/components/error"
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

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

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
    return <ErrorCard message={error.message} className="w-full" />
  }

  const dataPoints = data?.periodAggregationSeries.dataPoints ?? []

  // Collect all unique accounts in stable order (by first appearance)
  const accountMap = new Map<string, { id: string; name: string; color: string }>()
  for (const dp of dataPoints) {
    for (const acc of dp.expenses.byAccount) {
      if (!accountMap.has(acc.ledgerAccount.id)) {
        const idx = accountMap.size
        accountMap.set(acc.ledgerAccount.id, {
          id: acc.ledgerAccount.id,
          name: acc.ledgerAccount.name,
          color: PALETTE[idx % PALETTE.length],
        })
      }
    }
  }
  const accounts = Array.from(accountMap.values())

  const chartConfig = Object.fromEntries(
    accounts.map((a) => [a.id, { label: a.name, color: a.color }]),
  ) satisfies ChartConfig

  const chartData = dataPoints.map((dp) => {
    const date = new Date(dp.startDate)
    const row: Record<string, string | number> = { month: `${date.getMonth() + 1}月` }
    for (const acc of dp.expenses.byAccount) {
      row[acc.ledgerAccount.id] = acc.totalAmount
    }
    return row
  })

  return (
    <Card className="w-full">
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
                const month = payload[0].payload.month as string
                const total = (payload as { value: number }[]).reduce((s, p) => s + p.value, 0)
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <p className="mb-1 font-medium">{month}</p>
                    {[...payload].reverse().map((p) => (
                      <div key={p.dataKey as string} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: p.fill as string }}
                        />
                        <span className="text-muted-foreground">
                          {accountMap.get(p.dataKey as string)?.name}
                        </span>
                        <span className="ml-auto pl-4 tabular-nums">
                          {formatYen(p.value as number)}
                        </span>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">合計</span>
                      <span className="tabular-nums">{formatYen(total)}</span>
                    </div>
                  </div>
                )
              }}
            />
            {accounts.map((acc, i) => (
              <Bar
                key={acc.id}
                dataKey={acc.id}
                stackId="stack"
                fill={acc.color}
                radius={i === accounts.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>
        {/* Legend */}
        {accounts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: acc.color }}
                />
                <span className="text-muted-foreground">{acc.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const Loading = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="font-medium text-sm">月別支出</CardTitle>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-56 w-full" />
    </CardContent>
  </Card>
)
