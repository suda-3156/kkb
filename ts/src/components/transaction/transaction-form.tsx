"use client"

import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { useAtom, useSetAtom } from "jotai"
import { PlusCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  type JournalEntryDraft,
  newEntryAtom,
  removeEntryAtom,
  resetTransactionFormAtom,
  transactionFormAtom,
} from "@/store/transaction-form"

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------
const GET_LEDGER_ACCOUNTS = gql`
  query GetLedgerAccounts {
    ledgerAccounts(first: 100) {
      nodes {
        id
        name
        kind
        isGroup
      }
    }
  }
`

const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
      date
      description
      entries {
        id
        amount
        kind
        ledgerAccount {
          id
          name
        }
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LedgerAccount {
  id: string
  name: string
  kind: string
  isGroup: boolean
}

const KIND_LABELS: Record<string, string> = {
  ASSET: "資産",
  LIABILITY: "負債",
  EXPENSE: "費用",
  REVENUE: "収益",
  EQUITY: "資本",
}

// ---------------------------------------------------------------------------
// Entry Row
// ---------------------------------------------------------------------------
function EntryRow({
  entry,
  accounts,
  index,
  canRemove,
}: {
  entry: JournalEntryDraft
  accounts: LedgerAccount[]
  index: number
  canRemove: boolean
}) {
  const [_form, setForm] = useAtom(transactionFormAtom)
  const removeEntry = useSetAtom(removeEntryAtom)

  function updateEntry(patch: Partial<JournalEntryDraft>) {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)),
    }))
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
      {/* Ledger Account */}
      <div className="space-y-1">
        {index === 0 && <Label className="text-muted-foreground text-xs">勘定科目</Label>}
        <Select
          value={entry.ledgerAccountId}
          onValueChange={(v) => updateEntry({ ledgerAccountId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([kind, label]) => {
              const group = accounts.filter((a) => a.kind === kind)
              if (group.length === 0) return null
              return (
                <SelectGroup key={kind}>
                  <SelectLabel>{label}</SelectLabel>
                  {group.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        {index === 0 && <Label className="text-muted-foreground text-xs">金額 (円)</Label>}
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={entry.amount}
          onChange={(e) => updateEntry({ amount: e.target.value })}
        />
      </div>

      {/* Kind */}
      <div className="space-y-1">
        {index === 0 && <Label className="text-muted-foreground text-xs">借/貸</Label>}
        <Select
          value={entry.kind}
          onValueChange={(v) => updateEntry({ kind: v as JournalEntryDraft["kind"] })}
        >
          <SelectTrigger className="w-25">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEBIT">借方</SelectItem>
            <SelectItem value="CREDIT">貸方</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Remove */}
      <div className={index === 0 ? "pt-5" : ""}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          onClick={() => removeEntry(entry.id)}
          aria-label="行を削除"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
export function TransactionForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [form, setForm] = useAtom(transactionFormAtom)
  const addEntry = useSetAtom(newEntryAtom)
  const resetForm = useSetAtom(resetTransactionFormAtom)

  const {
    data: accountsData,
    loading: accountsLoading,
    error: accountsError,
  } = useQuery<{
    ledgerAccounts: { nodes: LedgerAccount[] }
  }>(GET_LEDGER_ACCOUNTS)

  const [createTransaction, { loading: submitting, error: mutationError }] = useMutation(
    CREATE_TRANSACTION,
    {
      refetchQueries: ["GetDashboardData"],
      onCompleted() {
        resetForm()
        onSuccess?.()
      },
    },
  )

  // グループ勘定科目は仕訳明細に使用しない
  const accounts = (accountsData?.ledgerAccounts.nodes ?? []).filter((a) => !a.isGroup)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const entries = form.entries
      .filter((en) => en.ledgerAccountId && en.amount)
      .map((en) => ({
        ledgerAccountId: en.ledgerAccountId,
        amount: Math.round(Number(en.amount)),
        kind: en.kind,
      }))

    if (entries.length < 2) {
      alert("仕訳は最低2行必要です。")
      return
    }

    await createTransaction({
      variables: {
        input: {
          date: form.date,
          description: form.description,
          entries,
        },
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="date">日付</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description">摘要</Label>
          <Input
            id="description"
            placeholder="取引の内容を入力"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Journal Entries */}
      <div className="space-y-2">
        <Label>仕訳明細</Label>
        {accountsLoading ? (
          <p className="text-muted-foreground text-sm">勘定科目を読み込み中...</p>
        ) : accountsError ? (
          <p className="text-destructive text-sm">
            勘定科目の取得に失敗しました: {accountsError.message}
          </p>
        ) : accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            勘定科目が登録されていません。先に勘定科目を作成してください。
          </p>
        ) : (
          <div className="space-y-2">
            {form.entries.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                accounts={accounts}
                index={i}
                canRemove={form.entries.length > 2}
              />
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="mt-2"
          disabled={accounts.length === 0}
        >
          <PlusCircle className="mr-1 h-4 w-4" />
          行を追加
        </Button>
      </div>

      {mutationError && (
        <p className="text-destructive text-sm">エラーが発生しました: {mutationError.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
          リセット
        </Button>
        <Button
          type="submit"
          disabled={submitting || accountsLoading || !!accountsError || accounts.length === 0}
        >
          {submitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  )
}
