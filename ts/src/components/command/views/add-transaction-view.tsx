"use client"

import { CalendarIcon, CreditCardIcon, FileTextIcon, SendIcon, TagIcon } from "lucide-react"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { LedgerAccountKind } from "@/graph/graphql"
import { AccountCombobox } from "../components/account-combobox"
import type { AccountOption, CommandPage, TransactionDraft } from "../types"

type AddTransactionViewProps = {
  draft: TransactionDraft
  /** The active sub-page (e.g. "pay" means we're doing account autocomplete) */
  subPage: CommandPage
  onNavigate: (page: CommandPage) => void
  onPaySelect: (account: AccountOption) => void
  onTargetSelect: (account: AccountOption) => void
}

export function AddTransactionView({
  draft,
  subPage,
  onNavigate,
  onPaySelect,
  onTargetSelect: _onTargetSelect,
}: AddTransactionViewProps) {
  const isExpense = draft.mode === "expense"

  // When on the "pay" sub-page, render account combobox for ASSET accounts
  if (subPage === "pay") {
    return (
      <AccountCombobox
        kinds={[LedgerAccountKind.Asset]}
        selectedId={draft.payAccount?.id}
        onSelect={onPaySelect}
      />
    )
  }

  // Normal "add-expense" / "add-revenue" command list
  return (
    <CommandList>
      <CommandEmpty>コマンドを入力してください (/desc, /pay, /target, /amount, /date)</CommandEmpty>

      <CommandGroup heading="入力フィールド">
        <CommandItem value="/desc" keywords={["desc", "description", "説明"]} onSelect={() => {}}>
          <FileTextIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">
            説明{" "}
            {draft.description && (
              <span className="ml-2 font-medium text-foreground text-xs">
                = {draft.description}
              </span>
            )}
          </span>
          <CommandShortcut className="font-mono">/desc 説明</CommandShortcut>
        </CommandItem>

        <CommandItem
          value="/pay"
          keywords={["pay", "支払", "支払い", "口座"]}
          onSelect={() => onNavigate("pay")}
        >
          <CreditCardIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">
            支払い方法{" "}
            {draft.payAccount && (
              <span className="ml-2 font-medium text-foreground text-xs">
                = {draft.payAccount.name}
              </span>
            )}
          </span>
          <CommandShortcut className="font-mono">/pay [Tab]</CommandShortcut>
        </CommandItem>

        <CommandItem
          value="/target"
          keywords={["target", "対象", isExpense ? "支出科目" : "収入科目"]}
          onSelect={() => onNavigate(isExpense ? "add-expense" : "add-revenue")}
        >
          <TagIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">
            {isExpense ? "支出科目" : "収入科目"}{" "}
            {draft.targetAccount && (
              <span className="ml-2 font-medium text-foreground text-xs">
                = {draft.targetAccount.name}
              </span>
            )}
          </span>
          <CommandShortcut className="font-mono">/target [Tab]</CommandShortcut>
        </CommandItem>

        <CommandItem value="/amount" keywords={["amount", "金額", "円"]} onSelect={() => {}}>
          <span className="size-4 text-center font-bold text-muted-foreground">¥</span>
          <span className="flex-1">
            金額{" "}
            {draft.amountStr && (
              <span className="ml-2 font-medium text-foreground text-xs">
                = ¥{Number(draft.amountStr.replace(/\D/g, "")).toLocaleString()}
              </span>
            )}
          </span>
          <CommandShortcut className="font-mono">/amount 金額</CommandShortcut>
        </CommandItem>

        <CommandItem value="/date" keywords={["date", "日付", "日"]} onSelect={() => {}}>
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="flex-1">
            日付 <span className="ml-2 font-medium text-foreground text-xs">= {draft.date}</span>
          </span>
          <CommandShortcut className="font-mono">/date YYYY-MM-DD</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="確定">
        <CommandItem
          value="/submit"
          keywords={["submit", "確定", "保存", "送信"]}
          disabled={!isDraftValid(draft)}
          onSelect={() => {}}
        >
          <SendIcon className="size-4 text-primary" />
          <span className="flex-1">トランザクションを保存</span>
          <CommandShortcut>⌘↵</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  )
}

/** Whether the draft has the minimum required fields */
export function isDraftValid(draft: TransactionDraft): boolean {
  return (
    Boolean(draft.description) &&
    Boolean(draft.payAccount) &&
    Boolean(draft.targetAccount) &&
    Boolean(draft.amountStr) &&
    !Number.isNaN(Number(draft.amountStr.replace(/\D/g, ""))) &&
    Number(draft.amountStr.replace(/\D/g, "")) > 0 &&
    Boolean(draft.date)
  )
}
