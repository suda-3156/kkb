"use client"

import { FileIcon, FolderIcon } from "lucide-react"
import { TreeItem } from "./tree-item"
import { useLedgerAccount } from "./use-ledger-account"

export const LedgerAccountForm = () => {
  const { tree, handleArchive } = useLedgerAccount()

  return (
    <div>
      <div {...tree.getContainerProps()} className="relative">
        <div
          style={tree.getDragLineStyle()}
          className="pointer-events-none absolute h-0.5 bg-primary/60"
        />
        {tree.getItems().map((item) => (
          <TreeItem
            key={item.getId()}
            item={item}
            onArchive={handleArchive}
            onCompleteRenaming={() => tree.completeRenaming()}
            onAbortRenaming={() => tree.abortRenaming()}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2 border-border border-t pt-3">
        {/** biome-ignore lint/a11y/noStaticElementInteractions: This is a draggable element */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ isGroup: false }))
          }}
          className="flex cursor-grab items-center gap-1.5 rounded border border-border border-dashed px-2 py-1.5 text-muted-foreground text-sm transition-colors hover:border-foreground/40 hover:text-foreground active:cursor-grabbing"
        >
          <FileIcon className="size-4 shrink-0" />
          新しい科目
        </div>
        {/** biome-ignore lint/a11y/noStaticElementInteractions: This is a draggable element */}
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ isGroup: true }))
          }}
          className="flex cursor-grab items-center gap-1.5 rounded border border-border border-dashed px-2 py-1.5 text-muted-foreground text-sm transition-colors hover:border-foreground/40 hover:text-foreground active:cursor-grabbing"
        >
          <FolderIcon className="size-4 shrink-0 text-amber-500" />
          新しいフォルダ
        </div>
      </div>
    </div>
  )
}
