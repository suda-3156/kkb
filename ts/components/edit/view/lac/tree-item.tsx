import type { ItemInstance } from "@headless-tree/core"
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronRight,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  Pencil,
  X,
} from "lucide-react"
import { Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Node } from "./types"

type ActionsProps = {
  node: Node
  onArchive: (id: string, archived: boolean) => void
  onStartRenaming: () => void
}

const Actions = ({ node, onArchive, onStartRenaming }: ActionsProps) => (
  <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={(e) => {
        e.preventDefault()
        onStartRenaming()
      }}
    >
      <Pencil className="size-3.5" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-6 shrink-0",
        node.archivedAt
          ? "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
      )}
      onClick={(e) => {
        e.preventDefault()
        onArchive(node.id, !!node.archivedAt)
      }}
    >
      {node.archivedAt ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
    </Button>
  </div>
)

type RenamingItemProps = {
  item: ItemInstance<Node>
  onCompleteRenaming: () => void
  onAbortRenaming: () => void
}

const RenamingItem = ({ item, onCompleteRenaming, onAbortRenaming }: RenamingItemProps) => (
  <div
    className="flex items-center gap-1.5 rounded px-1.5 py-1"
    style={{ paddingLeft: `${item.getItemMeta().level * 16 + 6}px` }}
  >
    <Input
      {...item.getRenameInputProps()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          onCompleteRenaming()
          return
        }
        item.getRenameInputProps().onKeyDown?.(e)
      }}
      className="flex-1 rounded border border-input bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
    />
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
      onMouseDown={(e) => {
        e.preventDefault()
        onCompleteRenaming()
      }}
    >
      <Check className="size-3.5" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      onMouseDown={(e) => {
        e.preventDefault()
        onAbortRenaming()
      }}
    >
      <X className="size-3.5" />
    </Button>
  </div>
)

type DefaultItemProps = {
  item: ItemInstance<Node>
  onArchive: (id: string, archived: boolean) => void
}

const DefaultItem = ({ item, onArchive }: DefaultItemProps) => {
  const node = item.getItemData()

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The div has onKeyDown handler to handle renaming with keyboard
    <div
      {...item.getProps()}
      onKeyDown={(e) => {
        if (e.key === "Enter" && item.isSelected()) {
          e.preventDefault()
          item.startRenaming()
          return
        }
        item.getProps().onKeyDown?.(e)
      }}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm outline-none transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        item.isSelected() && "bg-primary/10 text-primary",
        item.isDragTarget() && "bg-primary/20 ring-1 ring-primary/40 ring-inset",
        item.isFocused() && "bg-cyan-200/20",
      )}
      style={{ paddingLeft: `${item.getItemMeta().level * 16 + 6}px` }}
    >
      {node.isGroup ? (
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            item.isExpanded() && "rotate-90",
          )}
        />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}

      {node.isGroup ? (
        item.isExpanded() ? (
          <FolderOpenIcon className="size-4 shrink-0 text-amber-500" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-amber-500" />
        )
      ) : (
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      )}

      <span
        className={cn(
          "flex-1 truncate transition-colors",
          "archivedAt" in node && node.archivedAt && "text-muted-foreground/50 line-through",
        )}
      >
        {node.name}
      </span>
      {"archivedAt" in node && (
        <Actions node={node} onArchive={onArchive} onStartRenaming={() => item.startRenaming()} />
      )}
    </div>
  )
}

type TreeItemProps = {
  item: ItemInstance<Node>
  onArchive: (id: string, archived: boolean) => void
  onCompleteRenaming: () => void
  onAbortRenaming: () => void
}

export const TreeItem = ({
  item,
  onArchive,
  onCompleteRenaming,
  onAbortRenaming,
}: TreeItemProps) => (
  <Fragment key={item.getId()}>
    {item.isRenaming() ? (
      <RenamingItem
        item={item}
        onCompleteRenaming={onCompleteRenaming}
        onAbortRenaming={onAbortRenaming}
      />
    ) : (
      <DefaultItem item={item} onArchive={onArchive} />
    )}
  </Fragment>
)
