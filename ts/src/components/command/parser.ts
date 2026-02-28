import type { CommandPage, ParsedCommand } from "./types"

/**
 * Parse a slash command string into a structured action.
 *
 * Examples:
 *   "/add expense"       → { type: "navigate", page: "add-expense" }
 *   "/add revenue"       → { type: "navigate", page: "add-revenue" }
 *   "/desc 食料品"        → { type: "desc", value: "食料品" }
 *   "/pay 現金"           → { type: "pay", query: "現金" }
 *   "/amount 1500"       → { type: "amount", value: "1500" }
 *   "/date 2026-02-28"   → { type: "date", value: "2026-02-28" }
 *   "/submit"            → { type: "submit" }
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()
  if (!trimmed.startsWith("/")) return { type: "unknown", raw: trimmed }

  // Remove leading slash and split
  const body = trimmed.slice(1).trimStart()
  const [cmd, ...rest] = body.split(/\s+/)
  const arg = rest.join(" ").trim()

  switch (cmd?.toLowerCase()) {
    case "add": {
      const sub = arg.toLowerCase()
      if (sub === "expense") return { type: "navigate", page: "add-expense" as CommandPage }
      if (sub === "revenue") return { type: "navigate", page: "add-revenue" as CommandPage }
      return { type: "unknown", raw: trimmed }
    }
    case "desc":
      return { type: "desc", value: arg }
    case "pay":
      return { type: "pay", query: arg }
    case "amount":
      return { type: "amount", value: arg }
    case "date":
      return { type: "date", value: arg }
    case "submit":
      return { type: "submit" }
    default:
      return { type: "unknown", raw: trimmed }
  }
}

/**
 * Whether the input string looks like the start of a slash command
 * (starts with "/" and is not yet a complete command)
 */
export function isSlashCommand(input: string): boolean {
  return input.startsWith("/")
}

/**
 * Returns the command prefix so we can highlight matching items in the list.
 * e.g. "/de" → "de"
 */
export function getCommandPrefix(input: string): string {
  if (!input.startsWith("/")) return ""
  return input.slice(1).split(/\s+/)[0] ?? ""
}

/** Format a YYYY-MM-DD date string for display */
export function formatDateInput(raw: string): string {
  // Accept YYYYMMDD → YYYY-MM-DD
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return raw
}

/** Parse amount string to integer yen, returns NaN if invalid */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[,，_\s]/g, "")
  return Number.parseInt(cleaned, 10)
}
