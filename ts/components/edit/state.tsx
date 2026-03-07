import { atom } from "jotai"

export type ModalView =
  | "expense" // create expense form
  | "revenue" // create revenue form
  | "transfer" // create transfer form
  | "txn" // input or edit transaction form
  | "lac" // create or edit ledger account form

export type ModalState = {
  open: boolean
  view?: ModalView
  txnId?: string // For edit mode of transaction, the ID of the transaction being edited
}

export const modalStateAtom = atom<ModalState>({
  open: false,
})

export const openModalAtom = atom(null, (_get, set, view: ModalView, txnId?: string) => {
  set(modalStateAtom, {
    open: true,
    view: view,
    txnId: txnId,
  })
})

export const closeModalAtom = atom(null, (_get, set) => {
  set(modalStateAtom, (prev) => ({ ...prev, open: false }))
})
