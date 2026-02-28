import { cn } from "@/lib/utils"
import type { TransactionDraft } from "../types"

type FieldChipProps = {
  label: string
  value: string | null | undefined
  command: string
}

function FieldChip({ label, value, command }: FieldChipProps) {
  const filled = Boolean(value)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        filled
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-muted-foreground/40 border-dashed text-muted-foreground",
      )}
      title={`Type ${command} to set`}
    >
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span>{filled ? value : "—"}</span>
    </span>
  )
}

type DraftSummaryProps = {
  draft: TransactionDraft
  className?: string
}

export function DraftSummary({ draft, className }: DraftSummaryProps) {
  const modeLabel = draft.mode === "expense" ? "支出追加" : "収入追加"
  const amountDisplay = draft.amountStr
    ? `¥${Number(draft.amountStr.replace(/\D/g, "")).toLocaleString()}`
    : null
  const dateDisplay = draft.date || null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-2",
        className,
      )}
    >
      <span className="mr-1 font-semibold text-foreground text-xs">[{modeLabel}]</span>
      <FieldChip label="日付" value={dateDisplay} command="/date" />
      <FieldChip label="説明" value={draft.description || null} command="/desc" />
      <FieldChip label="支払い" value={draft.payAccount?.name ?? null} command="/pay" />
      <FieldChip label="対象" value={draft.targetAccount?.name ?? null} command="/target" />
      <FieldChip label="金額" value={amountDisplay} command="/amount" />
    </div>
  )
}
