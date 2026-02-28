"use client"

import { useQuery } from "@apollo/client/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { LoadingInline } from "@/components/loading"
import { CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { graphql } from "@/graph"
import type { GetLedgerAccountsQuery } from "@/graph/graphql"
import { type CmdPage, goBackAtom, pageLabels, selectLedgerAccountContextAtom } from "../state"

const page: CmdPage = "selectLedgerAccount"

const GetLedgerAccounts = graphql(/* GraphQL */ `
  query GetLedgerAccounts ($first: Int!, $after: ID) {
    ledgerAccounts(first: $first, after: $after) {
      nodes {
        id
        name
        kind
        isGroup
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

export const SelectLedgerAccountCmdPage = () => {
  const context = useAtomValue(selectLedgerAccountContextAtom)
  const goBack = useSetAtom(goBackAtom)
  const setContext = useSetAtom(selectLedgerAccountContextAtom)

  const { data, loading, error, fetchMore } = useQuery<GetLedgerAccountsQuery>(GetLedgerAccounts, {
    variables: {
      first: 100,
    },
  })

  useEffect(() => {
    if (!loading && data?.ledgerAccounts.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.ledgerAccounts.pageInfo.endCursor,
        },
      })
    }
  }, [loading, data, fetchMore])

  if (error) {
    console.log(error)
    return <CommandEmpty>Error loading accounts.</CommandEmpty>
  }

  const accounts = (data?.ledgerAccounts.nodes ?? []).filter((a) => {
    if (!a || a.isGroup) return false
    if (context?.kind && a.kind !== context.kind) return false
    return true
  })

  const handleSelect = (account: { id: string; name: string }) => {
    context?.onSelect(account)
    setContext(null)
    goBack()
  }

  return (
    <CommandGroup heading={pageLabels[page]}>
      <CommandEmpty>{loading ? <LoadingInline /> : "No results found."}</CommandEmpty>
      {accounts.map(
        (a) =>
          a && (
            <CommandItem key={a.id} value={a.name} onSelect={() => handleSelect(a)}>
              {a.name}
            </CommandItem>
          ),
      )}
    </CommandGroup>
  )
}
