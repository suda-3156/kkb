import { atom } from "jotai"

export type JournalEntryKind = "DEBIT" | "CREDIT"

export interface JournalEntryDraft {
  id: string // local UUID for keying
  ledgerAccountId: string
  amount: string // string for input binding, converted to number on submit
  kind: JournalEntryKind
}

export interface TransactionFormState {
  date: string // YYYY-MM-DD
  description: string
  entries: JournalEntryDraft[]
}

function newEntry(): JournalEntryDraft {
  return {
    id: crypto.randomUUID(),
    ledgerAccountId: "",
    amount: "",
    kind: "DEBIT",
  }
}

export const transactionFormAtom = atom<TransactionFormState>({
  date: new Date().toISOString().split("T")[0],
  description: "",
  entries: [newEntry(), newEntry()],
})

export const newEntryAtom = atom(null, (get, set) => {
  const prev = get(transactionFormAtom)
  set(transactionFormAtom, {
    ...prev,
    entries: [...prev.entries, newEntry()],
  })
})

export const removeEntryAtom = atom(null, (get, set, id: string) => {
  const prev = get(transactionFormAtom)
  set(transactionFormAtom, {
    ...prev,
    entries: prev.entries.filter((e) => e.id !== id),
  })
})

export const resetTransactionFormAtom = atom(null, (_get, set) => {
  set(transactionFormAtom, {
    date: new Date().toISOString().split("T")[0],
    description: "",
    entries: [newEntry(), newEntry()],
  })
})
