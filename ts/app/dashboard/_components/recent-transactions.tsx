import { ReceiptText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const recentTransactions = [
  {
    date: "03/07",
    desc: "スーパーマーケット",
    amount: "¥4,820",
    type: "expense",
    category: "食費",
  },
  { date: "03/06", desc: "電車定期代", amount: "¥14,200", type: "expense", category: "交通費" },
  { date: "03/05", desc: "給与", amount: "¥320,000", type: "revenue", category: "給与" },
  { date: "03/04", desc: "ランチ", amount: "¥980", type: "expense", category: "食費" },
  { date: "03/03", desc: "電気代", amount: "¥8,400", type: "expense", category: "光熱費" },
  { date: "03/02", desc: "コンビニ", amount: "¥1,240", type: "expense", category: "食費" },
  { date: "03/01", desc: "家賃", amount: "¥85,000", type: "expense", category: "住居費" },
]

export const RecentTransactions = () => {
  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <ReceiptText className="h-4 w-4" />
          最近の取引
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y">
          {recentTransactions.map((tx) => (
            <div
              key={`${tx.date}-${tx.desc}`}
              className="flex items-center justify-between px-6 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-muted-foreground text-xs tabular-nums">
                  {tx.date}
                </span>
                <div>
                  <p className="font-medium text-sm">{tx.desc}</p>
                  <p className="text-muted-foreground text-xs">{tx.category}</p>
                </div>
              </div>
              <span
                className={cn("font-semibold text-sm tabular-nums", {
                  "text-emerald-600 dark:text-emerald-400": tx.type === "revenue",
                  "text-foreground": tx.type !== "revenue",
                })}
              >
                {tx.type === "revenue" ? "+" : "−"}
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
