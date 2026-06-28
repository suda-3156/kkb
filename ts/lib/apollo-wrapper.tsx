"use client"

// Apollo client for client-side queries and mutations.

import { HttpLink } from "@apollo/client"
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs"

const link = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8080/query",
})

function makeClient() {
  return new ApolloClient({
    link: link,
    cache: new InMemoryCache({
      typePolicies: {
        PeriodAggregation: { merge: true },
        ExpenseSummary: { merge: true },
        RevenueSummary: { merge: true },
        Query: {
          fields: {
            ledgerAccounts: {
              keyArgs: ["kind", "includeArchived"],
              merge(existing, incoming, { args }) {
                // Only append when paginating (an `after` cursor is provided);
                // otherwise the initial page would be concatenated onto the
                // already-accumulated list, producing duplicate nodes.
                const previous = args?.after ? (existing?.nodes ?? []) : []
                return {
                  ...incoming,
                  nodes: [...previous, ...(incoming.nodes ?? [])],
                }
              },
            },
          },
        },
      },
    }),
  })
}

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>
}
