"use client"

import { useAtomValue } from "jotai"
import { Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  expensesSummaryAtom,
  monthlyExpensesByCategoryAtom,
  recentTransactionsAtom,
  weeklyExpensesAtom,
} from "./store"

const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`

export const ExpensesCard = () => {
  const { thisWeek, thisMonth, thisYear } = useAtomValue(expensesSummaryAtom)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-muted-foreground text-sm">支出</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground text-xs">今週</p>
          <p className="font-bold text-3xl tabular-nums">{formatYen(thisWeek)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">今月</p>
          <p className="font-semibold text-xl tabular-nums">{formatYen(thisMonth)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">今年</p>
          <p className="font-medium text-base text-muted-foreground tabular-nums">
            {formatYen(thisYear)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── カテゴリ別支出 (今月) ─────────────────────────────────────────────

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export const ExpensesByCategoryCard = () => {
  const data = useAtomValue(monthlyExpensesByCategoryAtom)

  const chartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: CHART_COLORS[i % CHART_COLORS.length] }]),
  ) satisfies ChartConfig

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-muted-foreground text-sm">
            カテゴリ別支出 (今月)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          データなし
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-muted-foreground text-sm">
          カテゴリ別支出 (今月)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatYen(Number(value))}
                  nameKey="name"
                />
              }
            />
            <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="mt-3 space-y-1">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="truncate">{d.name}</span>
              </div>
              <span className="tabular-nums">{formatYen(d.amount)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ── 週別支出推移 ─────────────────────────────────────────────────────────

const lineChartConfig = {
  amount: { label: "支出", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

export const ExpenseTransitionsCard = () => {
  const data = useAtomValue(weeklyExpensesAtom)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-muted-foreground text-sm">週別支出推移</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            データなし
          </div>
        ) : (
          <ChartContainer config={lineChartConfig} className="h-[200px] w-full">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
                tick={{ fontSize: 11 }}
              />
              <YAxis hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatYen(Number(value))}
                    labelFormatter={(label) => `週: ${label}`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── 直近の取引 ───────────────────────────────────────────────────────────

export const RecentTransactionsCard = () => {
  const transactions = useAtomValue(recentTransactionsAtom)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium text-muted-foreground text-sm">直近の取引</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            データなし
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => {
              const expenseAmount = t.entries
                .filter((e) => e.kind === "DEBIT" && e.ledgerAccount.kind === "EXPENSE")
                .reduce((sum, e) => sum + e.amount, 0)

              return (
                <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-muted-foreground text-xs">{t.date}</p>
                  </div>
                  {expenseAmount > 0 && (
                    <span className="ml-4 shrink-0 tabular-nums">{formatYen(expenseAmount)}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
