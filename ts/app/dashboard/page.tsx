import {
  ExpenseCategoryBreakdown,
  ExpenseSummary,
  MonthlyBalance,
  MonthlyExpenseTrend,
  RecentTransactions,
} from "./_components"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    // Single unified grid: 1 col → 2 col (md) → 3 col (lg)
    // max-w-7xl keeps the layout from stretching too wide on ultra-wide screens
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 pt-16 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: spending summary (this week / month / year) - 2 left columns at lg */}
      <ExpenseSummary />

      {/* Card 2: this month's balance - 1 right column at lg */}
      <MonthlyBalance />

      {/* Card 3: spending by category - 1 left column at lg */}
      <ExpenseCategoryBreakdown />

      {/* Card 4: monthly spending trend - 2 right columns at lg */}
      <MonthlyExpenseTrend />

      {/* Card 5: recent transactions - full width */}
      <RecentTransactions />
    </div>
  )
}
