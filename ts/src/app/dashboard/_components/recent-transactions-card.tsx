"use client"

import { useQuery } from "@apollo/client/react"
import { ErrorCard } from "@/components/cards/error-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { graphql } from "@/graph"
import { JournalEntryKind, LedgerAccountKind, type RecentTransactionsQuery } from "@/graph/graphql"
import { formatYen } from "@/lib/numutils"
import { dateStr } from "@/lib/timeutils"

const RecentTransactions = graphql(/* GraphQL */ `
  query RecentTransactions($today: Date!, $limit: Int!) {
    transactions(last: $limit, endDate: $today) {
      nodes {
        id
        date
        description
        entries {
          amount
          kind
          ledgerAccount {
            kind
          }
        }
      }
    }
  }
`)

type TransactionCategory = "expense" | "revenue" | "other"

const getCategory = (
  entries: { kind: JournalEntryKind; ledgerAccount: { kind: LedgerAccountKind } }[],
): TransactionCategory => {
  const hasDebitExpense = entries.some(
    (e) => e.kind === JournalEntryKind.Debit && e.ledgerAccount.kind === LedgerAccountKind.Expense,
  )
  if (hasDebitExpense) return "expense"

  const hasCreditRevenue = entries.some(
    (e) => e.kind === JournalEntryKind.Credit && e.ledgerAccount.kind === LedgerAccountKind.Revenue,
  )
  if (hasCreditRevenue) return "revenue"

  return "other"
}

const getTotalDebitAmount = (entries: { kind: JournalEntryKind; amount: number }[]): number => {
  return entries
    .filter((e) => e.kind === JournalEntryKind.Debit)
    .reduce((sum, e) => sum + e.amount, 0)
}

const categoryLabel: Record<TransactionCategory, string> = {
  expense: "支出",
  revenue: "収入",
  other: "その他",
}

const categoryColorClass: Record<TransactionCategory, string> = {
  expense: "text-red-500",
  revenue: "text-emerald-500",
  other: "text-muted-foreground",
}

export const RecentTransactionsCard = () => {
  const now = new Date()
  const { data, loading, error } = useQuery<RecentTransactionsQuery>(RecentTransactions, {
    variables: {
      today: dateStr(now),
      limit: 10,
    },
  })

  if (loading) {
    return <Loading />
  }

  if (error) {
    console.log(error)
    return <ErrorCard message={error.message} className="w-full" />
  }

  const transactions = data?.transactions.nodes?.filter(Boolean) ?? []

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-medium text-sm">最近の取引</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-100">
          <div className="space-y-1 px-6 pb-6">
            {transactions.length === 0 && (
              <p className="py-4 text-center text-muted-foreground text-sm">取引がありません</p>
            )}
            {transactions.map((tx) => {
              if (!tx) return null
              const category = getCategory(tx.entries)
              const totalAmount = getTotalDebitAmount(tx.entries)
              return (
                <div
                  key={tx.id}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium text-sm">{tx.description}</span>
                    <span className="text-muted-foreground text-xs">{tx.date}</span>
                  </div>
                  <div className="ml-4 flex shrink-0 flex-col items-end gap-0.5">
                    <span
                      className={`font-semibold text-sm tabular-nums ${categoryColorClass[category]}`}
                    >
                      {formatYen(totalAmount)}
                    </span>
                    <span className="text-muted-foreground text-xs">{categoryLabel[category]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

const Loading = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="font-medium text-sm">最近の取引</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
        <div key={i} className="flex items-center justify-between px-2 py-2.5">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)
