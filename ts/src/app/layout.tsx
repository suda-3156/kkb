import type { Metadata } from "next"
import { Montserrat, Open_Sans } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={cn("antialiased", montserrat.variable, openSans.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
