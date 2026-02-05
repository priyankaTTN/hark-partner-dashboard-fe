import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
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

const getRouteFromTitle = (title: string): string => {
  const titleMap: Record<string, string> = {
    "Suggested Clips": "/dashboard/suggested-clips",
    "Produced Clips": "/dashboard/produced-clips",
    "Playlists": "/dashboard/playlists",
    "Clips": "/dashboard/clips",
    "Topic": "/dashboard/topic",
    "Genre": "/dashboard/genre",
    "Tones": "/dashboard/tone",
  }
  return titleMap[title] || "/dashboard/suggested-clips"
}

const isPageActive = (title: string, location: ReturnType<typeof useLocation>): boolean => {
  const route = getRouteFromTitle(title)
  return location.pathname === route
}

export function AppSidebar() {
  const location = useLocation()

  // Initialize expanded items - auto-expand parent menus if their children are active
  const initializeExpandedItems = () => {
    const expanded = new Set<string>()
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.isActive || isPageActive(child.title, location)
        )
        if (hasActiveChild) {
          expanded.add(item.title)
        }
      }
    })
    return expanded
  }

  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(() => initializeExpandedItems())

  // Update expanded items when location changes
  React.useEffect(() => {
    const newExpanded = initializeExpandedItems()
    setExpandedItems(newExpanded)
  }, [location.pathname])

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
                      {hasChildren ? (
                        <SidebarMenuButton
                          asChild={false}
                          isActive={false}
                          className={cn(
                            "text-white hover:bg-[#2a2f4a] rounded-md cursor-pointer"
                          )}
                          onClick={() => {
                            setExpandedItems((prev) => {
                              const newSet = new Set(prev)
                              if (newSet.has(item.title)) {
                                newSet.delete(item.title)
                              } else {
                                newSet.add(item.title)
                              }
                              return newSet
                            })
                          }}
                        >
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
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={item.isActive || isPageActive(item.title, location)}
                          className={cn(
                            "text-white hover:bg-[#2a2f4a] rounded-md",
                            (item.isActive || isPageActive(item.title, location)) && "bg-[#2a2f4a]"
                          )}
                        >
                          <NavLink
                            to={getRouteFromTitle(item.title)}
                            className="flex items-center gap-3 w-full"
                          >
                            <item.icon className="size-5 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {item.action && (
                              <item.action className="size-4 shrink-0 ml-auto" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                      {hasChildren && (
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-200",
                            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          )}
                        >
                          <div className="pl-8 pt-1 space-y-1">
                            {item.children?.map((child) => {
                              const isChildActive = child.isActive || isPageActive(child.title, location)
                              return (
                                <SidebarMenuButton
                                  key={child.title}
                                  asChild
                                  isActive={isChildActive}
                                  className={cn(
                                    "text-white hover:bg-[#2a2f4a] rounded-md",
                                    isChildActive && "bg-[#2a2f4a]"
                                  )}
                                >
                                  <NavLink
                                    to={getRouteFromTitle(child.title)}
                                    className="flex items-center gap-3 w-full"
                                  >
                                    <child.icon className="size-4 shrink-0" />
                                    <span className="flex-1 text-sm">{child.title}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              )
                            })}
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
