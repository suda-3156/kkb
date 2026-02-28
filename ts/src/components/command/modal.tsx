"use client"

import { useMutation } from "@apollo/client/react"
import { useAtom, useSetAtom } from "jotai"
import * as React from "react"
import { toast } from "sonner"
import { Command, CommandDialog, CommandInput } from "@/components/ui/command"
import { graphql } from "@/graph"
import { JournalEntryKind } from "@/graph/graphql"
import {
  commandModalOpenAtom,
  commandPagesAtom,
  resetCommandModalAtom,
  transactionDraftAtom,
} from "./atoms"
import { DraftSummary } from "./components/draft-summary"
import { parseAmount, parseCommand } from "./parser"
import type { AccountOption, CommandPage } from "./types"
import { AddTransactionView, isDraftValid } from "./views/add-transaction-view"
import { IdleView } from "./views/idle-view"

// ─── Mutation ─────────────────────────────────────────────────────────────────

const CreateTransactionFromModal = graphql(/* GraphQL */ `
  mutation CreateTransactionFromModal($input: CreateTransactionInput!) {
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
`)

// ─── Placeholder text per page ────────────────────────────────────────────────

const PLACEHOLDER: Record<CommandPage, string> = {
  idle: "/ でコマンド入力、または検索...",
  "add-expense": "/desc 説明  /pay 支払い  /amount 金額",
  "add-revenue": "/desc 説明  /pay 受取口座  /amount 金額",
  pay: "口座名を検索 (Tab または Enter で選択)",
}

const PAGE_LABEL: Record<CommandPage, string> = {
  idle: "ホーム",
  "add-expense": "支出追加",
  "add-revenue": "収入追加",
  pay: "支払い方法",
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CommandModal = () => {
  const [open, setOpen] = useAtom(commandModalOpenAtom)
  const [pages, setPages] = useAtom(commandPagesAtom)
  const [draft, setDraft] = useAtom(transactionDraftAtom)
  const resetModal = useSetAtom(resetCommandModalAtom)

  const [inputValue, setInputValue] = React.useState("")
  const currentPage = pages[pages.length - 1] as CommandPage

  const [createTransaction, { loading: submitting }] = useMutation(CreateTransactionFromModal)

  // ⌘K toggle
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  // Reset input when page changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPage is derived from pages atom; reset on every page transition
  React.useEffect(() => {
    setInputValue("")
  }, [currentPage])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetModal()
      setInputValue("")
    }
    setOpen(next)
  }

  const navigateTo = (page: CommandPage) => {
    if (page === "add-expense") {
      setDraft((d) =>
        d
          ? { ...d, mode: "expense" }
          : {
              mode: "expense",
              description: "",
              date: new Date().toISOString().slice(0, 10),
              payAccount: null,
              targetAccount: null,
              amountStr: "",
            },
      )
      setPages(["idle", "add-expense"])
    } else if (page === "add-revenue") {
      setDraft((d) =>
        d
          ? { ...d, mode: "revenue" }
          : {
              mode: "revenue",
              description: "",
              date: new Date().toISOString().slice(0, 10),
              payAccount: null,
              targetAccount: null,
              amountStr: "",
            },
      )
      setPages(["idle", "add-revenue"])
    } else {
      setPages((p) => [...p, page])
    }
    setInputValue("")
  }

  const popPage = () => {
    if (pages.length <= 1) return
    setPages((p) => p.slice(0, -1))
    setInputValue("")
  }

  const handlePaySelect = (account: AccountOption) => {
    setDraft((d) => (d ? { ...d, payAccount: account } : null))
    popPage()
  }

  const handleTargetSelect = (account: AccountOption) => {
    setDraft((d) => (d ? { ...d, targetAccount: account } : null))
    popPage()
  }

  const handleSubmit = async () => {
    if (!draft || !isDraftValid(draft)) {
      toast.error("必須項目を入力してください（説明・支払い・対象科目・金額）")
      return
    }
    const amount = parseAmount(draft.amountStr)
    const isExpense = draft.mode === "expense"
    const targetId = draft.targetAccount?.id
    const payId = draft.payAccount?.id
    if (!targetId || !payId) {
      toast.error("必須項目を入力してください（説明・支払い・対象科目・金額）")
      return
    }
    const entries = isExpense
      ? [
          { ledgerAccountId: targetId, amount, kind: JournalEntryKind.Debit },
          { ledgerAccountId: payId, amount, kind: JournalEntryKind.Credit },
        ]
      : [
          { ledgerAccountId: payId, amount, kind: JournalEntryKind.Debit },
          { ledgerAccountId: targetId, amount, kind: JournalEntryKind.Credit },
        ]
    try {
      await createTransaction({
        variables: { input: { date: draft.date, description: draft.description, entries } },
      })
      toast.success(`「${draft.description}」を記録しました`)
      handleOpenChange(false)
    } catch (err) {
      toast.error("保存に失敗しました")
      console.error(err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ⌘Enter → submit
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
      return
    }
    // Backspace on empty input → pop page
    if (e.key === "Backspace" && !inputValue && pages.length > 1) {
      e.preventDefault()
      popPage()
      return
    }
    // Tab on add-* pages → open /pay autocomplete
    if (e.key === "Tab" && (currentPage === "add-expense" || currentPage === "add-revenue")) {
      e.preventDefault()
      navigateTo("pay")
      return
    }
    // Enter on a slash command string
    if (e.key === "Enter" && inputValue.startsWith("/")) {
      e.preventDefault()
      applyCommandInput(inputValue)
    }
  }

  const applyCommandInput = (raw: string) => {
    const parsed = parseCommand(raw)
    switch (parsed.type) {
      case "navigate":
        navigateTo(parsed.page)
        break
      case "desc":
        if (parsed.value) {
          setDraft((d) => (d ? { ...d, description: parsed.value } : null))
          setInputValue("")
        }
        break
      case "pay":
        navigateTo("pay")
        break
      case "amount": {
        const num = parseAmount(parsed.value)
        if (!Number.isNaN(num) && num > 0) {
          setDraft((d) => (d ? { ...d, amountStr: String(num) } : null))
          setInputValue("")
        }
        break
      }
      case "date":
        if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.value)) {
          setDraft((d) => (d ? { ...d, date: parsed.value } : null))
          setInputValue("")
        }
        break
      case "submit":
        handleSubmit()
        break
      default:
        break
    }
  }

  const isInTransaction =
    currentPage === "add-expense" || currentPage === "add-revenue" || currentPage === "pay"

  return (
    <CommandDialog
      className="max-w-lg rounded-xl border shadow-xl"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Command
        shouldFilter={currentPage === "idle" || currentPage === "pay"}
        onKeyDown={handleKeyDown}
        className="**:data-[slot=command-input-wrapper]:h-12"
      >
        {/* Draft summary header */}
        {draft && isInTransaction && <DraftSummary draft={draft} />}

        {/* Breadcrumb */}
        {pages.length > 1 && (
          <div className="flex items-center gap-1 px-3 pt-2 pb-0">
            {pages.map((page, i) => (
              <React.Fragment key={page}>
                {i > 0 && <span className="text-muted-foreground text-xs">/</span>}
                <span className="text-muted-foreground text-xs">{PAGE_LABEL[page]}</span>
              </React.Fragment>
            ))}
            <span className="ml-1 text-muted-foreground/50 text-xs">(Backspace で戻る)</span>
          </div>
        )}

        <CommandInput
          placeholder={PLACEHOLDER[currentPage]}
          value={inputValue}
          onValueChange={setInputValue}
          disabled={submitting}
        />

        {currentPage === "idle" && <IdleView onNavigate={navigateTo} />}

        {isInTransaction && draft && (
          <AddTransactionView
            draft={draft}
            subPage={currentPage}
            onNavigate={navigateTo}
            onPaySelect={handlePaySelect}
            onTargetSelect={handleTargetSelect}
          />
        )}
      </Command>
    </CommandDialog>
  )
}
