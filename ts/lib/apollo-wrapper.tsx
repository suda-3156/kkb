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
              merge(existing, incoming) {
                return {
                  ...incoming,
                  nodes: [...(existing?.nodes ?? []), ...(incoming.nodes ?? [])],
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
