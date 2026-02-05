import * as React from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/store/authSlice"
import { useAppDispatch, type RootState } from "@/store"

export function Login() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading: isLoading, errorMessage: error } = useSelector(
    (state: RootState) => state.auth
  )
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")

  // Redirect if already authenticated
  if (localStorage.getItem("isAuthenticated") === "true") {
    return <Navigate to="/dashboard/playlists" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    dispatch(
      login(username, password, () => {
        navigate("/dashboard/playlists", { replace: true })
      })
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1f3a] via-[#2a2f4a] to-[#1a1f3a] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">SiriusXM Dashboard</h1>
            <p className="text-white/70">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/50"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/50"
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <span className="text-white/70">Remember me</span>
              </label>
              <a
                href="#"
                className="text-white/70 hover:text-white transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-[#1a1f3a] hover:bg-white/90 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-white/60">
            Don't have an account?{" "}
            <a href="#" className="text-white hover:underline">
              Contact administrator
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

