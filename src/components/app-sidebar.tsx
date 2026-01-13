import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { menuItems } from "@/config/menu-items"
import { PlusIcon } from "@/components/icons"

export function AppSidebar() {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(title)) {
        newSet.delete(title)
      } else {
        newSet.add(title)
      }
      return newSet
    })
  }

  return (
    <Sidebar collapsible="icon" className="bg-[#1a1f3a] border-r border-[#2a2f4a]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isExpanded = expandedItems.has(item.title)
                const hasChildren = item.children && item.children.length > 0

                return (
                  <SidebarMenuItem key={item.title}>
                    <div>
                      <SidebarMenuButton
                        asChild={!hasChildren}
                        isActive={item.isActive}
                        className={cn(
                          "text-white hover:bg-[#2a2f4a] rounded-md",
                          item.isActive && "bg-[#2a2f4a]",
                          hasChildren && "cursor-pointer"
                        )}
                        onClick={hasChildren ? () => toggleExpanded(item.title) : undefined}
                      >
                        {hasChildren ? (
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className="size-5 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {item.action && (
                              <button
                                type="button"
                                className="size-4 shrink-0 flex items-center justify-center"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  // Handle action click if needed
                                }}
                              >
                                <item.action className="size-4 shrink-0" />
                              </button>
                            )}
                            <PlusIcon />
                          </div>
                        ) : (
                          <a href={item.url} className="flex items-center gap-3 w-full">
                            <item.icon className="size-5 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {item.action && (
                              <item.action className="size-4 shrink-0 ml-auto" />
                            )}
                          </a>
                        )}
                      </SidebarMenuButton>
                      {hasChildren && (
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-200",
                            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          )}
                        >
                          <div className="pl-8 pt-1 space-y-1">
                            {item.children?.map((child) => (
                              <SidebarMenuButton
                                key={child.title}
                                asChild
                                isActive={child.isActive}
                                className={cn(
                                  "text-white hover:bg-[#2a2f4a] rounded-md",
                                  child.isActive && "bg-[#2a2f4a]"
                                )}
                              >
                                <a href={child.url} className="flex items-center gap-3 w-full">
                                  <child.icon className="size-4 shrink-0" />
                                  <span className="flex-1 text-sm">{child.title}</span>
                                </a>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
