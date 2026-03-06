import type { GetLedgerAccountsQuery } from "@/graph/graphql"
import { LedgerAccountKind } from "@/graph/graphql"

export type Node = {
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

export const buildTree = (data: GetLedgerAccountsQuery | undefined): Record<string, Node> => {
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
