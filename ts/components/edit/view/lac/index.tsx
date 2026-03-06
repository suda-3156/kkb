"use client"

import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  createOnDropHandler,
  type DragTarget,
  dragAndDropFeature,
  type ItemInstance,
  insertItemsAtTarget,
  renamingFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
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
import * as React from "react"
import { Fragment } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { graphql } from "@/graph"
import { type GetLedgerAccountsQuery, LedgerAccountKind } from "@/graph/graphql"
import { cn } from "@/lib/utils"

const GetLedgerAccountsDoc = graphql(/* GraphQL */ `
  query GetLedgerAccounts ($first: Int!, $after: ID) {
    ledgerAccounts(first: $first, after: $after, includeArchived: true) {
      nodes {
        id
        name
        kind
        isGroup
        archivedAt
        updatedAt
        parent {
          id
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`)

const ArchiveLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation ArchiveLedgerAccount($id: ID!) {
    archiveLedgerAccount(id: $id) {
      id
      archivedAt
    }
  }
`)

const UnarchiveLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation UnarchiveLedgerAccount($id: ID!) {
    unarchiveLedgerAccount(id: $id) {
      id
      archivedAt
    }
  }
`)

const UpdateLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation UpdateLedgerAccount($input: UpdateLedgerAccountInput!) {
    updateLedgerAccount(input: $input) {
      id
      name
      parent {
        id
      }
    }
  }
`)

const CreateLedgerAccountDoc = graphql(/* GraphQL */ `
  mutation CreateLedgerAccount($input: CreateLedgerAccountInput!) {
    createLedgerAccount(input: $input) {
      id
      name
      kind
      isGroup
      updatedAt
      parent {
        id
      }
    }
  }
`)

type Node = {
  id: string
  name: string
  kind: LedgerAccountKind | null
  isGroup: boolean
  archivedAt?: string | null
  updatedAt?: string
  parent?: {
    id: string | null
  } | null
  children: string[]
}

const buildTree = (data: GetLedgerAccountsQuery | undefined): Record<string, Node> => {
  const nodes: Record<string, Node> = {
    __expense__: {
      id: "__expense__",
      name: "Expense",
      isGroup: true,
      children: [],
      kind: LedgerAccountKind.Expense,
    },
    __revenue__: {
      id: "__revenue__",
      name: "Revenue",
      isGroup: true,
      children: [],
      kind: LedgerAccountKind.Revenue,
    },
    __liability__: {
      id: "__liability__",
      name: "Liability",
      isGroup: true,
      children: [],
      kind: LedgerAccountKind.Liability,
    },
    __asset__: {
      id: "__asset__",
      name: "Asset",
      isGroup: true,
      children: [],
      kind: LedgerAccountKind.Asset,
    },
    __equity__: {
      id: "__equity__",
      name: "Equity",
      isGroup: true,
      children: [],
      kind: LedgerAccountKind.Equity,
    },
    __root__: {
      id: "__root__",
      name: "Root",
      isGroup: true,
      children: ["__expense__", "__revenue__", "__liability__", "__asset__", "__equity__"],
      kind: null,
    },
  }

  if (!data) return nodes

  data.ledgerAccounts.nodes?.forEach((el) => {
    if (!el) return
    nodes[el.id] = {
      id: el.id,
      name: el.name,
      kind: el.kind,
      isGroup: el.isGroup,
      archivedAt: el.archivedAt,
      updatedAt: el.updatedAt,
      parent: {
        id: el.parent?.id || null,
      },
      children: [],
    }
  })

  Object.values(nodes).forEach((node) => {
    if (node.id.startsWith("__")) return
    if (node.parent?.id) {
      const parentNode = nodes[node.parent.id]
      if (parentNode && "children" in parentNode) {
        parentNode.children.push(node.id)
      }
    } else {
      const kindNodeId = `__${node.kind?.toLowerCase()}__`
      const kindNode = nodes[kindNodeId]
      if (kindNode && "children" in kindNode) {
        kindNode.children.push(node.id)
      }
    }
  })

  return nodes
}

export const LedgerAccountForm = () => {
  const { data, error, loading, fetchMore } = useQuery<GetLedgerAccountsQuery>(
    GetLedgerAccountsDoc,
    { variables: { first: 100 } },
  )
  const [archiveLedgerAccount] = useMutation(ArchiveLedgerAccountDoc)
  const [unarchiveLedgerAccount] = useMutation(UnarchiveLedgerAccountDoc)
  const [updateLedgerAccount] = useMutation(UpdateLedgerAccountDoc)
  const [createLedgerAccount] = useMutation(CreateLedgerAccountDoc)

  React.useEffect(() => {
    if (!loading && data?.ledgerAccounts.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          first: 100,
          after: data.ledgerAccounts.pageInfo.endCursor,
        },
      })
    }

    if (!loading && error) {
      toast.error("科目の情報の取得に失敗しました")
    }
  }, [loading, data, fetchMore, error])

  const nodes = React.useMemo(() => buildTree(data), [data])

  const tree = useTree<Node>({
    rootItemId: "__root__",
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().isGroup,

    // drag and drop to create new items
    canDropForeignDragObject: (_, target) => {
      if (!target.item.isFolder()) return false
      if (target.item.getId() === "__root__") return false
      const node = target.item.getItemData()
      if (node.archivedAt) return false
      return true
    },
    onDropForeignDragObject: async (dataTransfer, target) => {
      let isGroup = false
      try {
        const parsed = JSON.parse(dataTransfer.getData("text/plain"))
        isGroup = parsed.isGroup ?? false
      } catch {
        return
      }
      const name = isGroup ? "新しいフォルダ" : "新しい科目"
      const result = await handleCreate(target.item.getId(), name, isGroup)

      if (!result) {
        toast.warning("ツリーの更新に失敗しました。ページをリロードしてください。")
        return
      }

      nodes[result.id] = {
        id: result.id,
        name: result.name,
        kind: result.kind,
        isGroup: result.isGroup,
        updatedAt: result.updatedAt,
        parent: {
          id: result.parent?.id || null,
        },
        children: [],
      }

      insertItemsAtTarget([result?.id], target, (item, newChildrenIds) => {
        nodes[(item as ItemInstance<Node>).getId()].children = newChildrenIds as string[]
      })
    },

    // drag and drop to move items
    canReorder: true,
    canDrag: (items) => items.every((item) => !item.getId().startsWith("__")),
    canDrop: (items, target) => {
      if (!target.item.isFolder()) return false
      if (items.length !== 1) return false

      const [item] = items
      if (!item) return false

      if (item.getId() === target.item.getId()) return false
      if (item.getItemData().parent?.id === target.item.getId()) return false

      if (item.getItemData().kind !== target.item.getItemData().kind) return false

      if (target.item.getItemData().archivedAt) return false

      return true
    },
    onDrop: async (items, target) => {
      const [item] = items
      if (!item) return

      createOnDropHandler((parentItem, newChildren) => {
        nodes[(parentItem as ItemInstance<Node>).getId()].children = newChildren as string[]
      })(items as unknown as ItemInstance<unknown>[], target as unknown as DragTarget<unknown>)

      nodes[item.getId()].parent = { id: target.item.getId() }

      await handleChangeParent(item.getId(), target.item.getId())
    },

    // renaming
    canRename: (item) => !item.getId().startsWith("__"),
    onRename: (item, value) => {
      console.log("rename", item.getId(), value)
      nodes[item.getId()].name = value
      handleRename(item.getId(), value)
    },

    dataLoader: {
      getItem: (itemId) => nodes[itemId],
      getChildren: (itemId) => nodes[itemId].children,
    },
    indent: 16,
    features: [syncDataLoaderFeature, selectionFeature, renamingFeature, dragAndDropFeature],
  })

  const handleArchive = async (id: string, archived: boolean) => {
    try {
      await (archived
        ? unarchiveLedgerAccount({
            variables: { id },
            refetchQueries: ["GetLedgerAccounts"],
            awaitRefetchQueries: true,
          })
        : archiveLedgerAccount({
            variables: { id },
            refetchQueries: ["GetLedgerAccounts"],
            awaitRefetchQueries: true,
          }))
    } catch (e) {
      if (CombinedGraphQLErrors.is(e)) {
        switch (e.errors[0]?.extensions?.code) {
          case "PARENT_IS_ARCHIVED":
            toast.error("親科目がアーカイブされているため、科目をアンアーカイブできませんでした")
            return
        }
      }
      console.log("error", e)
      toast.error("科目を更新できませんでした")
    }
  }

  const handleChangeParent = async (id: string, newParentId: string) => {
    try {
      await updateLedgerAccount({
        variables: {
          input: {
            id,
            parentId: newParentId?.startsWith("__") ? null : newParentId,
            unsetParent: !!newParentId?.startsWith("__"),
            updatedAt: nodes[id].updatedAt,
          },
        },
        refetchQueries: ["GetLedgerAccounts"],
        awaitRefetchQueries: true,
      })
    } catch (e) {
      if (CombinedGraphQLErrors.is(e)) {
        switch (e.errors[0]?.extensions?.code) {
          case "PARENT_IS_ARCHIVED":
            toast.error("親科目がアーカイブされているため、科目の親を変更できませんでした")
            return
        }
      }
      console.log("error", e)
      toast.error("科目を更新できませんでした")
    }
  }

  const handleRename = async (id: string, newName: string) => {
    try {
      await updateLedgerAccount({
        variables: {
          input: {
            id,
            name: newName,
            updatedAt: nodes[id].updatedAt,
          },
        },
        refetchQueries: ["GetLedgerAccounts"],
        awaitRefetchQueries: true,
      })
    } catch (e) {
      console.log("error", e)
      toast.error("科目を更新できませんでした")
    }
  }

  const handleCreate = async (parentId: string, name: string, isGroup = false) => {
    const kind = nodes[parentId].kind
    if (!kind) return
    try {
      const result = await createLedgerAccount({
        variables: {
          input: {
            name,
            isGroup,
            parentId: parentId.startsWith("__") ? null : parentId,
            kind,
          },
        },
        refetchQueries: ["GetLedgerAccounts"],
        awaitRefetchQueries: true,
      })
      return result.data?.createLedgerAccount
    } catch (e) {
      console.log("error", e)
      toast.error("科目を作成できませんでした")
    }
  }

  return (
    <div>
      <div {...tree.getContainerProps()} className="relative">
        <div
          style={tree.getDragLineStyle()}
          className="pointer-events-none absolute h-0.5 bg-primary/60"
        />
        {tree.getItems().map((item) => {
          const node = item.getItemData()
          return (
            <Fragment key={item.getId()}>
              {item.isRenaming() ? (
                <div
                  className="flex items-center gap-1.5 rounded px-1.5 py-1"
                  style={{ paddingLeft: `${item.getItemMeta().level * 16 + 6}px` }}
                >
                  <Input
                    {...item.getRenameInputProps()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        tree.completeRenaming()
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
                      tree.completeRenaming()
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
                      tree.abortRenaming()
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
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
                      "archivedAt" in node &&
                        node.archivedAt &&
                        "text-muted-foreground/50 line-through",
                    )}
                  >
                    {node.name}
                  </span>
                  {"archivedAt" in node && (
                    <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                      {!node.archivedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={(e) => {
                            e.preventDefault()
                            item.startRenaming()
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
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
                          handleArchive(node.id, !!node.archivedAt)
                        }}
                      >
                        {node.archivedAt ? (
                          <ArchiveRestore className="size-3.5" />
                        ) : (
                          <Archive className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          )
        })}
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
