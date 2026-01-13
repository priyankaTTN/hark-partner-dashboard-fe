import * as React from "react"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"

export function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    // Check if user is already logged in (from localStorage)
    return localStorage.getItem("isAuthenticated") === "true"
  })

  const handleLogin = () => {
    localStorage.setItem("isAuthenticated", "true")
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return <Dashboard onLogout={handleLogout} />
}

export default App
