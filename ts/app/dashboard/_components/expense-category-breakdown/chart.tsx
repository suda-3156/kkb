"use client"

import { Cell, Pie, PieChart } from "recharts"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatYen } from "@/lib/numutils"

export type ChartItem = {
  name: string
  value: number
  ratio: number
  fill: string
}

type Props = {
  chartData: ChartItem[]
  totalAmount: number
}

export const ExpenseCategoryChart = ({ chartData, totalAmount }: Props) => {
  const chartConfig = Object.fromEntries(
    chartData.map((item) => [item.name, { label: item.name, color: item.fill }]),
  ) satisfies ChartConfig

  return (
    <div className="space-y-4">
      {/* Donut chart — taller on mobile (full-width card), compact on md+ */}
      <ChartContainer config={chartConfig} className="mx-auto h-52 w-full sm:h-44">
        <PieChart>
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]
              return (
                <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-muted-foreground tabular-nums">
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
            innerRadius="52%"
            outerRadius="88%"
            paddingAngle={2}
          >
            {chartData.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Category list */}
      <div className="space-y-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-3 tabular-nums">
              <span className="text-muted-foreground text-xs">
                {(item.ratio * 100).toFixed(1)}%
              </span>
              <span className="w-20 text-right font-medium">{formatYen(item.value)}</span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">合計</span>
          <span className="font-semibold tabular-nums">{formatYen(totalAmount)}</span>
        </div>
      </div>
    </div>
  )
}
