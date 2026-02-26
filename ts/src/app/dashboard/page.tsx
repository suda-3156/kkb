import { Dashboard } from "@/app/dashboard/_components/dashboard"
import { TransactionModal } from "@/components/transaction/transaction-modal"

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">家計簿</h1>
            <p className="text-muted-foreground text-sm">収支の記録と分析</p>
          </div>
          <TransactionModal />
        </div>

        {/* Dashboard */}
        <Dashboard />
      </div>
    </main>
  )
}
