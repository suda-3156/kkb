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
    cache: new InMemoryCache(), // TODO: Set up cache policies and type policies as needed
  })
}

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>
}
