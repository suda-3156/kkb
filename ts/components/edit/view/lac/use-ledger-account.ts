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
import * as React from "react"
import { toast } from "sonner"
import type { GetLedgerAccountsQuery } from "@/graph/graphql"
import {
  ArchiveLedgerAccountDoc,
  CreateLedgerAccountDoc,
  GetLedgerAccountsDoc,
  UnarchiveLedgerAccountDoc,
  UpdateLedgerAccountDoc,
} from "./queries"
import { buildTree, type Node } from "./types"

export const useLedgerAccount = () => {
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

  const tree = useTree<Node>({
    rootItemId: "__root__",
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().isGroup,

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

  return { tree, handleArchive }
}
