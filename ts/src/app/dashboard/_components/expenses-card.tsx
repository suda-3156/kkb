"use client"

import { useQuery } from "@apollo/client/react"
import { ErrorCard } from "@/components/error"
import { Card, CardContent } from "@/components/ui/card"
import Reveal from "@/components/ui/reveal"
import { Skeleton } from "@/components/ui/skeleton"
import { graphql } from "@/graph"
import type { PeriodicExpensesQuery } from "@/graph/graphql"
import { formatYen } from "@/lib/numutils"
import { getMonthStr, getWeekStr, getYearStr } from "@/lib/timeutils"

const PeriodicExpenses = graphql(/* GraphQL */ `
  query PeriodicExpenses(
    $weekStart: Date!, $weekEnd: Date!
    $monthStart: Date!, $monthEnd: Date!
    $yearStart: Date!, $yearEnd: Date!
  ) {
    thisWeek:  periodAggregation(startDate: $weekStart,  endDate: $weekEnd)  { expenses { totalAmount } }
    thisMonth: periodAggregation(startDate: $monthStart, endDate: $monthEnd) { expenses { totalAmount } }
    thisYear:  periodAggregation(startDate: $yearStart,  endDate: $yearEnd)  { expenses { totalAmount } }
  }
`)

export const ExpensesCard = () => {
  const now = new Date()
  const { data, loading, error } = useQuery<PeriodicExpensesQuery>(PeriodicExpenses, {
    variables: {
      weekStart: getWeekStr(now).start,
      weekEnd: getWeekStr(now).end,
      monthStart: getMonthStr(now).start,
      monthEnd: getMonthStr(now).end,
      yearStart: getYearStr(now).start,
      yearEnd: getYearStr(now).end,
    },
  })

  if (loading) {
    return (
      <Card className="h-53.5 w-full">
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-13 w-60" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-44" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-7 w-36" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    console.log(error)
    return <ErrorCard message={error.message} className="h-53.5 w-full" />
  }

  return (
    <Card className="w-full">
      <CardContent className="space-y-4">
        <Reveal index={0}>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">今週</p>
            <p className="text-right font-bold text-5xl tabular-nums md:text-6xl">
              {formatYen(data?.thisWeek.expenses.totalAmount ?? 0)}
            </p>
          </div>
        </Reveal>
        <Reveal index={1}>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">今月</p>
            <p className="text-right font-semibold text-4xl tabular-nums">
              {formatYen(data?.thisMonth.expenses.totalAmount ?? 0)}
            </p>
          </div>
        </Reveal>
        <Reveal index={2}>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">今年</p>
            <p className="text-right font-medium text-2xl text-muted-foreground tabular-nums">
              {formatYen(data?.thisYear.expenses.totalAmount ?? 0)}
            </p>
          </div>
        </Reveal>
      </CardContent>
    </Card>
  )
}
