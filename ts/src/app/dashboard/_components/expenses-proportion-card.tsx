"use client"

import { useQuery } from "@apollo/client/react/compiled"
import { Cell, Pie, PieChart } from "recharts"
import { ErrorCard } from "@/components/error"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { graphql } from "@/graph"
import type { ExpensesProportionQuery } from "@/graph/graphql"
import { formatYen } from "@/lib/numutils"
import { getMonthStr } from "@/lib/timeutils"

const ExpensesProportion = graphql(/* GraphQL */ `
  query ExpensesProportion($start: Date!, $end: Date!) {
    periodAggregation(startDate: $start, endDate: $end) {
        expenses {
            totalAmount
            byAccount {
                totalAmount
                ratio
                ledgerAccount {
                    name
                    id
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

export const ExpensesProportionCard = () => {
  const { start, end } = getMonthStr(new Date())

  const { data, loading, error } = useQuery<ExpensesProportionQuery>(ExpensesProportion, {
    variables: {
      start,
      end,
    },
  })

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorCard message={error.message} className="w-full" />
  }

  const byAccount = data?.periodAggregation.expenses.byAccount ?? []

  const sorted = [...byAccount].sort((a, b) => b.totalAmount - a.totalAmount)

  const chartData = sorted.map((item, i) => ({
    name: item.ledgerAccount.name,
    value: item.totalAmount,
    ratio: item.ratio,
    fill: PALETTE[i % PALETTE.length],
  }))

  const chartConfig = Object.fromEntries(
    chartData.map((item) => [item.name, { label: item.name, color: item.fill }]),
  ) satisfies ChartConfig

  const totalAmount = data?.periodAggregation.expenses.totalAmount ?? 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-medium text-sm">今月の支出割合</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {chartData.length === 0 ? (
          <p className="px-6 py-4 text-center text-muted-foreground text-sm">支出がありません</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* pi chart */}
            <Chart chartConfig={chartConfig} chartData={chartData} />

            {/* list */}
            <List chartData={chartData} totalAmount={totalAmount} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const Chart = ({
  chartConfig,
  chartData,
}: {
  chartConfig: ChartConfig
  chartData: {
    name: string
    value: number
    fill: string
  }[]
}) => (
  <ChartContainer config={chartConfig} className="mx-auto h-48 w-full px-6 md:h-60 lg:h-64">
    <PieChart>
      <ChartTooltip
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null
          const item = payload[0]
          return (
            <div className="items-start space-x-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatYen(item.value as number)}
              </span>
            </div>
          )
        }}
      />
      <Pie
        data={chartData}
        dataKey="value"
        nameKey="name"
        startAngle={90}
        endAngle={-270}
        innerRadius="50%"
        outerRadius="90%"
        paddingAngle={2}
      >
        {chartData.map((item) => (
          <Cell key={item.name} fill={item.fill} />
        ))}
      </Pie>
    </PieChart>
  </ChartContainer>
)

const List = ({
  chartData,
  totalAmount,
}: {
  chartData: { name: string; value: number; ratio: number; fill: string }[]
  totalAmount: number
}) => (
  <>
    <div className="block max-h-32 space-y-2 overflow-y-auto pl-6 sm:hidden">
      <ul className="mr-4 space-y-1.5">
        {chartData.map((item) => (
          <li key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2 tabular-nums">
              <span className="text-muted-foreground text-xs">
                {(item.ratio * 100).toFixed(1)}%
              </span>
              <span className="font-medium">{formatYen(item.value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
    <div className="flex items-center justify-between border-t px-6 pt-1.5 pr-3 text-sm sm:hidden">
      <span className="text-muted-foreground">合計</span>
      <span className="font-semibold tabular-nums">{formatYen(totalAmount)}</span>
    </div>
  </>
)

const Loading = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="font-medium text-sm">今月の支出割合</CardTitle>
    </CardHeader>
    <CardContent className="mx-auto flex h-48 w-full flex-col px-6 md:h-60 lg:h-64">
      <Skeleton className="mx-auto h-48 w-48 shrink-0 rounded-full sm:h-60 sm:w-60" />
      <div className="space-y-2 sm:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-sm" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
