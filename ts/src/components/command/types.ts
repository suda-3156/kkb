import type { LedgerAccountKind } from "@/graph/graphql"

// ─── Modal pages (cmdk pages stack) ───────────────────────────────────────────

export type CommandPage = "idle" | "add-expense" | "add-revenue" | "pay" // /pay account autocomplete sub-page

// ─── Draft ────────────────────────────────────────────────────────────────────

export type AccountOption = {
  id: string
  name: string
  kind: LedgerAccountKind
  isGroup: boolean
}

/** A single journal entry line being composed */
export type DraftEntry = {
  account: AccountOption
  amount: number // in yen (integer)
}

/** The in-progress transaction being composed via command modal */
export type TransactionDraft = {
  /** "expense" = debit expense / credit asset; "revenue" = credit revenue / debit asset */
  mode: "expense" | "revenue"
  description: string
  date: string // ISO date string YYYY-MM-DD
  /** The payment/source account (ASSET) */
  payAccount: AccountOption | null
  /** The target account (EXPENSE or REVENUE) */
  targetAccount: AccountOption | null
  /** Raw amount string as typed */
  amountStr: string
}

export const EMPTY_DRAFT: TransactionDraft = {
  mode: "expense",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  payAccount: null,
  targetAccount: null,
  amountStr: "",
}

// ─── Parsed commands ──────────────────────────────────────────────────────────

export type ParsedCommand =
  | { type: "navigate"; page: CommandPage }
  | { type: "desc"; value: string }
  | { type: "pay"; query: string }
  | { type: "amount"; value: string }
  | { type: "date"; value: string }
  | { type: "submit" }
  | { type: "unknown"; raw: string }
