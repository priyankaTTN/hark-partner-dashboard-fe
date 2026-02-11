import { Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Tone } from "@/pages/Tone"
import { Genre } from "@/pages/Genre"
import { Topic } from "@/pages/Topic"
import { SuggestedClips } from "@/pages/SuggestedClips"
import { ProducedClips } from "@/pages/ProducedClips"
import { Clips } from "@/pages/Clips"
import { ClipDetail } from "@/pages/ClipDetail"
import { Playlists } from "@/pages/Playlists"
import { PlaylistDetail } from "@/pages/PlaylistDetail"

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/suggested-clips" replace />} />
        <Route path="suggested-clips" element={<SuggestedClips />} />
        <Route path="produced-clips" element={<ProducedClips />} />
        <Route path="tone" element={<Tone />} />
        <Route path="topic" element={<Topic />} />
        <Route path="genre" element={<Genre />} />
        <Route path="clips" element={<Clips />} />
        <Route path="clips/:id" element={<ClipDetail />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlists/:id" element={<PlaylistDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard/suggested-clips" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/suggested-clips" replace />} />
    </Routes>
  )
}

export default App
