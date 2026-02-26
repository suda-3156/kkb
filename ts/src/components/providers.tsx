"use client"

import { Provider as JotaiProvider } from "jotai"
import { ThemeProvider } from "@/components/theme/provider"
import { Toaster } from "@/components/ui/sonner"
import { ApolloWrapper } from "@/lib/apollo-wrapper"
import { ThemeHeader } from "./theme/header"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // disableTransitionOnChange
    >
      <main className="relative flex min-h-screen flex-col bg-background">
        <ThemeHeader />
        <div className="container relative mx-auto flex flex-1 flex-col px-4 pt-14 pb-20">
          <ApolloWrapper>
            <JotaiProvider>{children}</JotaiProvider>
          </ApolloWrapper>
        </div>
      </main>
      <Toaster />
    </ThemeProvider>
  )
}
