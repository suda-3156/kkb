"use client"

import { useSetAtom } from "jotai"
import { Moon, PiggyBank, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { openModalAtom } from "./edit/state"
import { Button } from "./ui/button"

export function Header() {
  const { theme, setTheme } = useTheme()

  const open = useSetAtom(openModalAtom)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="container pointer-events-auto mx-auto flex items-center justify-end space-x-2 pt-5 pr-5">
        <Button
          onClick={() => open("expense")}
          variant="ghost"
          size="icon"
          className="mr-2 overflow-clip bg-background shadow-sm"
        >
          <PiggyBank />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 overflow-clip bg-background shadow-sm"
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
