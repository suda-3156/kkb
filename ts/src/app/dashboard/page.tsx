"use client"

import { useQuery } from "@apollo/client/react"
import { graphql } from "@/graph"
import type { ListTransactionsQuery } from "@/graph/graphql"

const ListTransactions = graphql(/* GraphQL */ `
  query ListTransactions($first: Int!, $startDate: Date!, $endDate: Date!) {
    transactions(first: $first , startDate: $startDate, endDate: $endDate) {
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
      totalCount
    }
  }
`)

export default function Dashboard() {
  const start = "2025-12-01"
  const end = "2026-02-28"

  const { data, loading, error } = useQuery<ListTransactionsQuery>(ListTransactions, {
    variables: { first: 100, startDate: start, endDate: end },
  })

  const firstTransaction = data?.transactions.nodes ? data?.transactions.nodes[0] : "undefined"

  console.log("first transaction in the data", firstTransaction)

  if (loading) return <div>Loading...</div>
  if (error) {
    console.error("Error fetching user data:", error)
    return <div>Error</div>
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
      </div>
    </main>
  )
}
