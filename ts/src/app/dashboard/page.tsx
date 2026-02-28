import { ExpensesCard } from "./_components/expenses-card"
import { ExpensesProportionCard } from "./_components/expenses-proportion-card"
import { MonthlyExpensesBarCard } from "./_components/monthly-expenses-bar-card"
import { RecentTransactionsCard } from "./_components/recent-transactions-card"

export default function DashboardPage() {
  return (
    // On mobile: flex-col with `contents` wrappers so order-X applies directly to cards
    // On md+:   two flex-col columns side by side (each stacks independently → no cross-row gap)
    // On lg:    5-col grid, left 2 cols / right 3 cols (1:1.5 ratio)
    <div className="flex flex-col gap-4 p-4 pt-16 md:grid md:grid-cols-2 md:items-start lg:grid-cols-5">
      {/* Left column: expenses (mobile 1st) + recent (mobile 3rd) */}
      <div className="contents md:flex md:flex-col md:gap-4 lg:col-span-2">
        <div className="order-1 md:order-0">
          <ExpensesCard />
        </div>
        <div className="order-3 md:order-0">
          <RecentTransactionsCard />
        </div>
      </div>
      {/* Right column: proportion (mobile 2nd) + monthly (mobile 4th) */}
      <div className="contents md:flex md:flex-col md:gap-4 lg:col-span-3">
        <div className="order-2 md:order-0">
          <ExpensesProportionCard />
        </div>
        <div className="order-4 hidden sm:block">
          <MonthlyExpensesBarCard />
        </div>
      </div>
    </div>
  )
}
