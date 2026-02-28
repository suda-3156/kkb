import { atom } from "jotai"
import { type CommandPage, EMPTY_DRAFT, type TransactionDraft } from "./types"

/** Whether the command modal is open */
export const commandModalOpenAtom = atom(false)

/** The page history stack for cmdk pages pattern */
export const commandPagesAtom = atom<CommandPage[]>(["idle"])

/** Derived: current page (top of stack) */
export const currentCommandPageAtom = atom((get) => {
  const pages = get(commandPagesAtom)
  return pages[pages.length - 1] as CommandPage
})

/** The in-progress transaction draft */
export const transactionDraftAtom = atom<TransactionDraft | null>(null)

/** Reset all command modal state */
export const resetCommandModalAtom = atom(null, (_get, set) => {
  set(commandPagesAtom, ["idle"])
  set(transactionDraftAtom, null)
})

/** Open modal and initialize for a given mode */
export const openCommandModalAtom = atom(null, (_get, set, page: CommandPage = "idle") => {
  set(commandPagesAtom, ["idle"])
  set(commandModalOpenAtom, true)
  if (page === "add-expense") {
    set(commandPagesAtom, ["idle", "add-expense"])
    set(transactionDraftAtom, { ...EMPTY_DRAFT, mode: "expense" })
  } else if (page === "add-revenue") {
    set(commandPagesAtom, ["idle", "add-revenue"])
    set(transactionDraftAtom, { ...EMPTY_DRAFT, mode: "revenue" })
  }
})
