import { ExpensesCard } from "./_components/expenses-card"
import { RecentTransactionsCard } from "./_components/recent-transactions-card"

export default function DashboardPage() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 pt-20">
      <ExpensesCard />
      <RecentTransactionsCard />
    </div>
  )
}
