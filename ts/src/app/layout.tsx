import type { Metadata } from "next"
import { Montserrat, Open_Sans, Prata, Shippori_Mincho } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"
import { ThemeHeader } from "@/components/theme/header"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "kkb",
  robots: {
    index: false,
    follow: false,
  },
}

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "600", "700", "900"],
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["400", "500", "600"],
})

const prata = Prata({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-prata",
  weight: ["400"],
})

const shipporiMincho = Shippori_Mincho({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-shippori-mincho",
  weight: ["400", "500", "600", "700", "800"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "font-shippori-mincho antialiased",
          montserrat.variable,
          openSans.variable,
          prata.variable,
          shipporiMincho.variable,
        )}
      >
        <Providers>
          <main className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
            <ThemeHeader />
            <ScrollArea className="container relative mx-auto flex h-screen flex-1 flex-col overflow-y-auto">
              {children}
            </ScrollArea>
          </main>
        </Providers>
      </body>
    </html>
  )
}
