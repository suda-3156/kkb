"use client"

import { Provider as JotaiProvider } from "jotai"
import { ThemeProvider } from "@/components/theme/provider"
import { ApolloWrapper } from "@/lib/apollo-wrapper"

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
