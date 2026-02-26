"use client"

import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------
const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($startDate: Date!, $endDate: Date!) {
    transactions(first: 500, startDate: $startDate, endDate: $endDate) {
      nodes {
        id
        date
        description
        entries {
          id
          amount
          kind
          ledgerAccount {
            id
            name
            kind
          }
        }
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EntryKind = "DEBIT" | "CREDIT"
type AccountKind = "ASSET" | "LIABILITY" | "EXPENSE" | "REVENUE" | "EQUITY"

interface JournalEntry {
  id: string
  amount: number
  kind: EntryKind
  ledgerAccount: {
    id: string
    name: string
    kind: AccountKind
  }
}

interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  entries: JournalEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatAmount(yen: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(yen)
}

function getMonthLabel(dateStr: string) {
  const [year, month] = dateStr.split("-")
  return `${year}/${month}`
}

/** 費用合計: EXPENSE勘定 x DEBIT仕訳 */
function calcExpense(entries: JournalEntry[]): number {
  return entries
    .filter((e) => e.ledgerAccount.kind === "EXPENSE" && e.kind === "DEBIT")
    .reduce((s, e) => s + e.amount, 0)
}

/** 収益合計: REVENUE勘定 x CREDIT仕訳 */
function calcRevenue(entries: JournalEntry[]): number {
  return entries
    .filter((e) => e.ledgerAccount.kind === "REVENUE" && e.kind === "CREDIT")
    .reduce((s, e) => s + e.amount, 0)
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------
function SummaryCards({ currentMonthTxs }: { currentMonthTxs: Transaction[] }) {
  const allEntries = currentMonthTxs.flatMap((t) => t.entries)
  const expense = calcExpense(allEntries)
  const revenue = calcRevenue(allEntries)
  const net = revenue - expense

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">今月の支出</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-bold text-2xl text-destructive">{formatAmount(expense)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">今月の収入</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-bold text-2xl text-green-600">{formatAmount(revenue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-muted-foreground text-sm">収支差額</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className={`font-bold text-2xl ${net >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatAmount(net)}
            </p>
            <Badge variant={net >= 0 ? "default" : "destructive"}>
              {net >= 0 ? "黒字" : "赤字"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Monthly Trend Chart
// ---------------------------------------------------------------------------
const monthlyChartConfig = {
  expense: { label: "支出", color: "var(--chart-1)" },
  revenue: { label: "収入", color: "var(--chart-2)" },
} satisfies ChartConfig

function MonthlyTrendChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    const byMonth: Record<string, { expense: number; revenue: number }> = {}

    for (const txn of transactions) {
      const key = getMonthLabel(txn.date)
      if (!byMonth[key]) byMonth[key] = { expense: 0, revenue: 0 }
      byMonth[key].expense += calcExpense(txn.entries)
      byMonth[key].revenue += calcRevenue(txn.entries)
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({ month, ...vals }))
  }, [transactions])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>月別収支</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground text-sm">データがありません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>月別収支</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={monthlyChartConfig} className="h-64 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    new Intl.NumberFormat("ja-JP", {
                      style: "currency",
                      currency: "JPY",
                    }).format(Number(value))
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Expense Breakdown Chart  (current month)
// ---------------------------------------------------------------------------
const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function ExpenseBreakdownChart({ currentMonthTxs }: { currentMonthTxs: Transaction[] }) {
  const data = useMemo(() => {
    const byAccount: Record<string, number> = {}
    for (const txn of currentMonthTxs) {
      for (const entry of txn.entries) {
        if (entry.ledgerAccount.kind === "EXPENSE" && entry.kind === "DEBIT") {
          byAccount[entry.ledgerAccount.name] =
            (byAccount[entry.ledgerAccount.name] ?? 0) + entry.amount
        }
      }
    }
    return Object.entries(byAccount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [currentMonthTxs])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>今月の支出内訳</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center">
          <p className="text-muted-foreground text-sm">今月の支出データがありません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>今月の支出内訳</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((item, i) => (
                <Cell key={item.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
                  Number(value),
                )
              }
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <ul className="min-w-40 space-y-2 text-sm">
          {data.map((item, i) => (
            <li key={item.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {item.name}
              </span>
              <span className="font-medium">{formatAmount(item.value)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Recent Transactions List
// ---------------------------------------------------------------------------
function RecentTransactionsList({ transactions }: { transactions: Transaction[] }) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近の取引</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">取引履歴がありません</p>
        ) : (
          <ul className="space-y-0">
            {sorted.map((txn, i) => {
              const expense = calcExpense(txn.entries)
              const revenue = calcRevenue(txn.entries)
              return (
                <li key={txn.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-muted-foreground text-xs">{txn.date}</p>
                    </div>
                    <div className="text-right text-sm">
                      {expense > 0 && <p className="text-destructive">-{formatAmount(expense)}</p>}
                      {revenue > 0 && <p className="text-green-600">+{formatAmount(revenue)}</p>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function Dashboard() {
  const today = new Date()
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)

  const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`
  const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  const { data, loading, error } = useQuery<{ transactions: { nodes: Transaction[] } }>(
    GET_DASHBOARD_DATA,
    { variables: { startDate, endDate } },
  )

  const transactions = data?.transactions.nodes ?? []
  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthPrefix))

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["expense", "revenue", "net"] as const).map((label) => (
          <Card key={label}>
            <CardContent className="flex h-24 items-center justify-center">
              <p className="text-muted-foreground text-sm">読み込み中...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive text-sm">データの取得に失敗しました: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards currentMonthTxs={currentMonthTxs} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyTrendChart transactions={transactions} />
        <ExpenseBreakdownChart currentMonthTxs={currentMonthTxs} />
      </div>
      <RecentTransactionsList transactions={transactions} />
    </div>
  )
}
