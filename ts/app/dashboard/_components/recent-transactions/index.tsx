import { ReceiptText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { graphql } from "@/graph"
import {
  type DashboardRecentTransactionsQuery,
  JournalEntryKind,
  LedgerAccountKind,
} from "@/graph/graphql"
import { query } from "@/lib/apollo-client"
import { type RecentTransactionItem, RecentTransactionList } from "./list"

const DashboardRecentTransactionsDoc = graphql(/* GraphQL */ `
  query DashboardRecentTransactions($last: Int!) {
    transactions(last: $last) {
      nodes {
        id
        date
        description
        entries {
          amount
          kind
          ledgerAccount {
            kind
            name
          }
        }
      }
    }
  }
`)

type EntryInput = {
  kind: JournalEntryKind
  amount: number
  ledgerAccount: { kind: LedgerAccountKind; name: string }
}

const classifyTransaction = (
  entries: EntryInput[],
): Pick<RecentTransactionItem, "type" | "categoryName" | "amount"> => {
  const isExpense = entries.some(
    (e) => e.kind === JournalEntryKind.Debit && e.ledgerAccount.kind === LedgerAccountKind.Expense,
  )
  if (isExpense) {
    const account = entries.find(
      (e) =>
        e.kind === JournalEntryKind.Debit && e.ledgerAccount.kind === LedgerAccountKind.Expense,
    )
    return {
      type: "expense",
      categoryName: account?.ledgerAccount.name ?? "支出",
      amount: entries
        .filter((e) => e.kind === JournalEntryKind.Debit)
        .reduce((s, e) => s + e.amount, 0),
    }
  }

  const isRevenue = entries.some(
    (e) => e.kind === JournalEntryKind.Credit && e.ledgerAccount.kind === LedgerAccountKind.Revenue,
  )
  if (isRevenue) {
    const account = entries.find(
      (e) =>
        e.kind === JournalEntryKind.Credit && e.ledgerAccount.kind === LedgerAccountKind.Revenue,
    )
    return {
      type: "revenue",
      categoryName: account?.ledgerAccount.name ?? "収入",
      amount: entries
        .filter((e) => e.kind === JournalEntryKind.Credit)
        .reduce((s, e) => s + e.amount, 0),
    }
  }

  return {
    type: "other",
    categoryName: "その他",
    amount: entries
      .filter((e) => e.kind === JournalEntryKind.Debit)
      .reduce((s, e) => s + e.amount, 0),
  }
}

const formatDate = (dateStr: string): string => {
  // dateStr is YYYY-MM-DD
  const [, m, d] = dateStr.split("-")
  return `${m}/${d}`
}

export const RecentTransactions = async () => {
  const { data } = await query<DashboardRecentTransactionsQuery>({
    query: DashboardRecentTransactionsDoc,
    variables: { last: 10 },
  })

  const items: RecentTransactionItem[] = (data?.transactions.nodes ?? [])
    .filter((tx): tx is NonNullable<typeof tx> => tx != null)
    .map((tx) => {
      const { type, categoryName, amount } = classifyTransaction(tx.entries)
      return {
        id: tx.id,
        date: formatDate(tx.date),
        description: tx.description,
        categoryName,
        amount,
        type,
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <ReceiptText className="h-4 w-4" />
          最近の取引
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <RecentTransactionList items={items} />
      </CardContent>
    </Card>
  )
}
