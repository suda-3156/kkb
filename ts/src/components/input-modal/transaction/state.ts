import { atom } from "jotai"

type TransactionModalTab = "expense" | "revenue" | "transfer" | "transaction"

export type TransactionModalState =
  | { open: false }
  | { open: true; mode: "create"; tab: TransactionModalTab }
  | { open: true; mode: "edit"; transactionId: string }

export const transactionModalAtom = atom<TransactionModalState>({ open: false })

export const openCreateTransactionModalAtom = atom(
  null,
  (_get, set, tab: TransactionModalTab = "expense") => {
    set(transactionModalAtom, { open: true, mode: "create", tab })
  },
)

export const openEditTransactionModalAtom = atom(null, (_get, set, transactionId: string) => {
  set(transactionModalAtom, { open: true, mode: "edit", transactionId })
})

export const closeTransactionModalAtom = atom(null, (_get, set) => {
  set(transactionModalAtom, { open: false })
})
