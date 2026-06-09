// Apollo client for server-side queries and mutations.

import { HttpLink } from "@apollo/client"
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs"

// Server-side (RSC) runs inside the container, so it must reach the API via an
// internal, runtime-resolved URL. GRAPHQL_INTERNAL_URL (e.g. http://backend:8080/query)
// takes precedence; NEXT_PUBLIC_GRAPHQL_URL is the browser/build-time value
// (e.g. a same-origin "/query") which is not usable for server-side fetches.
const link = new HttpLink({
  uri:
    process.env.GRAPHQL_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_GRAPHQL_URL ??
    "http://localhost:8080/query",
})

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    link: link,
    cache: new InMemoryCache({
      typePolicies: {
        PeriodAggregation: { merge: true },
        ExpenseSummary: { merge: true },
        RevenueSummary: { merge: true },
      },
    }),
  })
})
