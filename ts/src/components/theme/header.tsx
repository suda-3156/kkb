"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeHeader() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="container pointer-events-auto mx-auto flex items-center justify-end pt-5 pr-5">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 overflow-clip bg-background/50"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  )
}
