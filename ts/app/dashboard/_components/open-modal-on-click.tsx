"use client"

import { useSetAtom } from "jotai"
import type { ModalView } from "@/components/edit/state"
import { openModalAtom } from "@/components/edit/state"

type Props = {
  view: ModalView
  txnId?: string
  children: React.ReactNode
  className?: string
}

export const OpenModalOnClick = ({ view, txnId, children, className }: Props) => {
  const openModal = useSetAtom(openModalAtom)

  return (
    <button type="button" onClick={() => openModal(view, txnId)} className={className}>
      {children}
    </button>
  )
}
