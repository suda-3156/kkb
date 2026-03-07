import { PieChart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { graphql } from "@/graph"
import type { ExpenseCategoryBreakdownQuery } from "@/graph/graphql"
import { query } from "@/lib/apollo-client"
import { thisMonthString } from "@/lib/timeutils"
import { ExpenseCategoryChart } from "./chart"

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const ExpenseCategoryBreakdownDoc = graphql(/* GraphQL */ `
  query ExpenseCategoryBreakdown($start: Date!, $end: Date!) {
    periodAggregation(startDate: $start, endDate: $end) {
      expenses {
        totalAmount
        byAccount {
          totalAmount
          ratio
          ledgerAccount {
            id
            name
          }
        }
      }
    }
  }
`)

export const ExpenseCategoryBreakdown = async () => {
  const { start, end } = thisMonthString()

  const { data } = await query<ExpenseCategoryBreakdownQuery>({
    query: ExpenseCategoryBreakdownDoc,
    variables: { start, end },
  })

  const totalAmount = data?.periodAggregation.expenses.totalAmount ?? 0
  const byAccount = data?.periodAggregation.expenses.byAccount ?? []

  const chartData = [...byAccount]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((item, i) => ({
      name: item.ledgerAccount.name,
      value: item.totalAmount,
      ratio: item.ratio,
      fill: PALETTE[i % PALETTE.length],
    }))

  const now = new Date()
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <PieChart className="h-4 w-4" />
          支出カテゴリ内訳
        </CardTitle>
        <CardDescription>{monthLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">支出がありません</p>
        ) : (
          <ExpenseCategoryChart chartData={chartData} totalAmount={totalAmount} />
        )}
      </CardContent>
    </Card>
  )
}
