// If the viewport is wider than the MOBILE_BREAKPOINT in @hooks/use-mobile,
// the edit modal is a dialog, otherwise it's a full-screen page.
// This wrapper component abstracts over the two cases.

import type { DialogRootChangeEventDetails } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// isMobile and close are computed once in Container and shared via context so
// that all child wrapper components stay in sync within the same render cycle,
// preventing the timing mismatch that would otherwise cause DialogContent to
// render without a Dialog.Root context.
const WrapperContext = React.createContext<{ isMobile: boolean; close: () => void }>({
  isMobile: false,
  close: () => {},
})
const useWrapperContext = () => React.useContext(WrapperContext)

export const Container = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange?: ((open: boolean, eventDetails: DialogRootChangeEventDetails) => void) | undefined
  children?: React.ReactNode
}) => {
  const isMobile = useIsMobile()
  const close = React.useCallback(
    () => onOpenChange?.(false, {} as DialogRootChangeEventDetails),
    [onOpenChange],
  )

  return (
    <WrapperContext.Provider value={{ isMobile, close }}>
      {isMobile ? (
        open ? (
          <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-background p-4">
            {children}
          </div>
        ) : null
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </WrapperContext.Provider>
  )
}

export const Content = ({
  className,
  showCloseButton = true,
  children,
}: {
  className?: string
  showCloseButton?: boolean
  children?: React.ReactNode
}) => {
  const { isMobile } = useWrapperContext()

  if (isMobile) {
    return <div className={cn("flex h-full flex-col gap-4", className)}>{children}</div>
  }

  return (
    <DialogContent className={className} showCloseButton={showCloseButton}>
      {children}
    </DialogContent>
  )
}

export const Header = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  const { isMobile, close } = useWrapperContext()

  if (isMobile) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button variant="ghost" size="icon-sm" onClick={close}>
          <XIcon />
          <span className="sr-only">閉じる</span>
        </Button>
        {children}
      </div>
    )
  }

  return <DialogHeader className={className}>{children}</DialogHeader>
}

export const Footer = ({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) => {
  const { isMobile } = useWrapperContext()

  if (isMobile) {
    return (
      <div
        className={cn(
          "-mx-4 flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  )
}
