"use client"

import { useQuery } from "@apollo/client/react"
import { useSetAtom } from "jotai"
import { useEffect } from "react"
import { Loading } from "@/components/loading"
import { graphql } from "@/graph"
import type { ListTransactionsQuery } from "@/graph/graphql"
import {
  ExpensesByCategoryCard,
  ExpensesCard,
  ExpenseTransitionsCard,
  RecentTransactionsCard,
} from "./_components/summary-cards"
import { transactionsAtom } from "./store"

const ListTransactions = graphql(/* GraphQL */ `
  query ListTransactions($first: Int!, $after: ID, $startDate: Date!) {
    transactions(first: $first, after: $after, startDate: $startDate) {
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
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)

const getStartDateStr = (): string => {
  const today = new Date()
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const beginningOfTheYear = new Date(today.getFullYear(), 0, 1)

  if (sixMonthsAgo < beginningOfTheYear) {
    return `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`
  }

  return `${beginningOfTheYear.getFullYear()}-01-01`
}

export default function Dashboard() {
  const start = getStartDateStr()

  const { data, loading, error, fetchMore } = useQuery<ListTransactionsQuery>(ListTransactions, {
    variables: { first: 30, startDate: start },
  })

  useEffect(() => {
    if (loading || error || !data) {
      return
    }

    const { endCursor, hasNextPage } = data.transactions.pageInfo

    if (hasNextPage) {
      fetchMore({
        variables: {
          after: endCursor,
        },
      })
    }
  }, [data, loading, error, fetchMore])

  const setTransactions = useSetAtom(transactionsAtom)

  useEffect(() => {
    if (data) {
      setTransactions(data)
    }
  }, [data, setTransactions])

  if (loading) {
    return <Loading />
  }

  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">KKB</h1>
          </div>
        </div>

        {/* Dashboard */}
        <div className="grid gap-6 md:grid-cols-2">
          <ExpensesCard />
          <ExpensesByCategoryCard />
        </div>
        <ExpenseTransitionsCard />
        <RecentTransactionsCard />
      </div>
    </main>
  )
}
