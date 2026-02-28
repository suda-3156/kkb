"use client"

import * as React from "react"
import { CommandDialog } from "../ui/command"

export const CommandModal = () => {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandDialog
      className="max-w-sm rounded-lg border"
      open={open}
      onOpenChange={setOpen}
    ></CommandDialog>
  )
}
