"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Context for sidebar state
export type SidebarContextType = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

// SidebarProvider - manages sidebar state
interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ defaultOpen = true, open: controlledOpen, onOpenChange, className, children, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

    const setIsOpen = React.useCallback(
      (open: boolean) => {
        if (controlledOpen === undefined) {
          setInternalOpen(open)
        }
        onOpenChange?.(open)
      },
      [controlledOpen, onOpenChange]
    )

    const toggle = React.useCallback(() => {
      setIsOpen(!isOpen)
    }, [isOpen, setIsOpen])

    const value = React.useMemo(
      () => ({
        isOpen,
        setIsOpen,
        toggle,
      }),
      [isOpen, setIsOpen, toggle]
    )

    return (
      <SidebarContext.Provider value={value}>
        <div ref={ref} className={cn("flex h-screen w-full overflow-hidden", className)} {...props}>
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

