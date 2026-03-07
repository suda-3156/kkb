"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatYen } from "@/lib/numutils"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export type MonthlyExpenseDataPoint = {
  // YYYY-MM-DD
  startDate: string
  byAccount: { id: string; name: string; totalAmount: number }[]
}

type Props = {
  dataPoints: MonthlyExpenseDataPoint[]
}

export const MonthlyExpenseBarChart = ({ dataPoints }: Props) => {
  // Collect all unique accounts in stable order (first appearance, then sorted by total desc)
  const accountMap = new Map<string, { id: string; name: string; color: string; total: number }>()
  for (const dp of dataPoints) {
    for (const acc of dp.byAccount) {
      if (!accountMap.has(acc.id)) {
        accountMap.set(acc.id, { id: acc.id, name: acc.name, color: "", total: 0 })
      }
      const entry = accountMap.get(acc.id)
      if (entry) entry.total += acc.totalAmount
    }
  }

  // Sort by total descending before assigning palette colours
  const accounts = [...accountMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((a, i) => ({ ...a, color: PALETTE[i % PALETTE.length] }))

  const chartConfig = Object.fromEntries(
    accounts.map((a) => [a.id, { label: a.name, color: a.color }]),
  ) satisfies ChartConfig

  const chartData = dataPoints.map((dp) => {
    const [, m] = dp.startDate.split("-")
    const row: Record<string, string | number> = { month: `${Number(m)}月` }
    for (const acc of dp.byAccount) {
      row[acc.id] = acc.totalAmount
    }
    return row
  })

  return (
    <div>
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
    </div>
  )
}
