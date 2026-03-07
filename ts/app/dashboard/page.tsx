import {
  ExpenseCategoryBreakdown,
  ExpenseSummary,
  MonthlyBalance,
  MonthlyExpenseTrend,
  RecentTransactions,
} from "./_components"

export default function DashboardPage() {
  return (
    // Single unified grid: 1 col → 2 col (md) → 3 col (lg)
    // max-w-7xl keeps the layout from stretching too wide on ultra-wide screens
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 pt-16 md:grid-cols-2 lg:grid-cols-3">
      {/* ── Card 1: 支出サマリー (今週 / 今月 / 今年) ── lg: 左2列 */}
      <ExpenseSummary />

      {/* ── Card 2: 今月の収支 ── lg: 右1列 */}
      <MonthlyBalance />

      {/* ── Card 3: 支出カテゴリ内訳 ── lg: 左1列 */}
      <ExpenseCategoryBreakdown />

      {/* ── Card 4: 月次支出推移 ── lg: 右2列 */}
      <MonthlyExpenseTrend />

      {/* ── Card 5: 最近の取引 ── full width */}
      <RecentTransactions />
    </div>
  )
}
