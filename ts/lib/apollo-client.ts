// Apollo client for server-side queries and mutations.

import { HttpLink } from "@apollo/client"
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs"

const link = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8080/query",
})

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    link: link,
    cache: new InMemoryCache(), // TODO: Set up cache policies and type policies as needed
  })
})
