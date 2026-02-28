"use client"

import { useQuery } from "@apollo/client/react"
import { CheckIcon, WalletIcon } from "lucide-react"
import { CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { graphql } from "@/graph"
import { LedgerAccountKind } from "@/graph/graphql"
import type { AccountOption } from "../types"

const LedgerAccountsForCommand = graphql(/* GraphQL */ `
  query LedgerAccountsForCommand {
    ledgerAccounts(first: 100) {
      nodes {
        id
        name
        kind
        isGroup
      }
    }
  }
`)

const KIND_LABEL: Record<LedgerAccountKind, string> = {
  [LedgerAccountKind.Asset]: "資産",
  [LedgerAccountKind.Liability]: "負債",
  [LedgerAccountKind.Expense]: "支出",
  [LedgerAccountKind.Revenue]: "収入",
  [LedgerAccountKind.Equity]: "資本",
}

type AccountComboboxProps = {
  /** Filter to these kinds. If undefined, show all */
  kinds?: LedgerAccountKind[]
  /** Currently selected account id */
  selectedId?: string | null
  onSelect: (account: AccountOption) => void
}

export function AccountCombobox({ kinds, selectedId, onSelect }: AccountComboboxProps) {
  const { data, loading } = useQuery(LedgerAccountsForCommand)

  const allAccounts = (data?.ledgerAccounts.nodes ?? []).filter(Boolean) as AccountOption[]

  // Filter by kind
  const kindFiltered = kinds ? allAccounts.filter((a) => kinds.includes(a.kind)) : allAccounts

  // Group by kind
  const grouped = kindFiltered.reduce<Record<string, AccountOption[]>>((acc, account) => {
    const label = KIND_LABEL[account.kind] ?? account.kind
    if (!acc[label]) acc[label] = []
    acc[label].push(account)
    return acc
  }, {})

  if (loading) {
    return (
      <CommandList>
        <CommandEmpty>読み込み中...</CommandEmpty>
      </CommandList>
    )
  }

  const entries = Object.entries(grouped)
  if (entries.length === 0) {
    return (
      <CommandList>
        <CommandEmpty>口座が見つかりません</CommandEmpty>
      </CommandList>
    )
  }

  return (
    <CommandList>
      {entries.map(([groupLabel, accounts]) => (
        <CommandGroup key={groupLabel} heading={groupLabel}>
          {accounts.map((account) => (
            <CommandItem
              key={account.id}
              value={account.name}
              onSelect={() => onSelect(account)}
              className="gap-2"
              keywords={[account.name, groupLabel]}
            >
              <WalletIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{account.name}</span>
              {account.id === selectedId && <CheckIcon className="size-4 shrink-0 text-primary" />}
            </CommandItem>
          ))}
        </CommandGroup>
      ))}
    </CommandList>
  )
}
