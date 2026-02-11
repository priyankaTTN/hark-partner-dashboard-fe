import { Outlet, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"

export function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    navigate("/login", { replace: true })
  }

  return (
    <SidebarProvider defaultOpen={true} className="flex flex-col min-h-screen w-full">
      {/* Fixed header: 55px, full width, does not scroll (spec §3.1, §3.2) */}
      <header
        className="flex h-[55px] shrink-0 items-center gap-2 border-b border-[#2a2f4a] px-4 justify-between bg-[#1a1f3a] fixed top-0 left-0 right-0 z-[1020]"
        aria-label="App header"
      >
        <h1 className="text-lg font-semibold text-white">SiriusXM Dashboard</h1>
        <Button variant="outline" onClick={handleLogout} className="ml-auto">
          Logout
        </Button>
      </header>
      {/* App body: margin-top for fixed header; contains fixed sidebar + scrollable main (spec §3.3, §4.1) */}
      <div className="flex flex-1 mt-[55px] overflow-x-hidden">
        <AppSidebar />
        <SidebarInset>
          {/* Main content: only this area scrolls with the page (spec §4.1); container-fluid padding 30px (§4.1) */}
          <div className="flex-1 min-w-0 px-[20px] py-4">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

