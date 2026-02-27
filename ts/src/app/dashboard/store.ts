import { atom } from "jotai"
import type { ListTransactionsQuery } from "@/graph/graphql"

const dataAtom = atom<ListTransactionsQuery["transactions"]["nodes"]>([])

// transactions not null and undefined only
export const transactionsAtom = atom(
  (get) => {
    return get(dataAtom) ?? []
  },
  (_, set, data: ListTransactionsQuery) => {
    if (!data || !data.transactions.nodes) {
      set(dataAtom, [])
      return
    }

    const transactions = data.transactions.nodes.filter(
      (t): t is NonNullable<typeof t> => t !== null,
    )

    set(dataAtom, transactions)
  },
)

// journal entries not null and undefined only
export const journalEntriesAtom = atom((get) => {
  const transactions = get(transactionsAtom)

  return transactions
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .flatMap((t) => t.entries)
    .filter((e): e is NonNullable<typeof e> => e !== null)
})
