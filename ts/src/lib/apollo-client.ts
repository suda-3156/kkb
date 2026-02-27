import { HttpLink } from "@apollo/client"
import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs"

const link = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8080/query",
})

export function makeClient() {
  return new ApolloClient({
    link: link,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            transactions: {
              // `after` と `first` を除いた引数でキャッシュキーを区別する
              keyArgs: ["startDate"],
              merge(existing, incoming) {
                return {
                  ...incoming,
                  nodes: [...(existing?.nodes ?? []), ...(incoming?.nodes ?? [])],
                }
              },
            },
          },
        },
      },
    }),
  })
}
