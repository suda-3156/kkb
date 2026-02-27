"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { graphql } from "@/graph"

export const PeriodicExpensesFragment = graphql(`/* GraphQL */
  fragment PeriodicExpenses on Query {
    


  `)

export const ExpensesCard = () => {
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
