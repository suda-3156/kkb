"use client"

import { Provider as JotaiProvider } from "jotai"
import { ApolloWrapper } from "@/lib/apollo-wrapper"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloWrapper>
      <JotaiProvider>{children}</JotaiProvider>
    </ApolloWrapper>
  )
}
