"use client"

import { Provider as JotaiProvider } from "jotai"
import { ApolloWrapper } from "@/lib/apollo-wrapper"
import { ThemeProvider } from "./theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // disableTransitionOnChange
    >
      <ApolloWrapper>
        <JotaiProvider>{children}</JotaiProvider>
      </ApolloWrapper>
    </ThemeProvider>
  )
}
