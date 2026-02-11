import { Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Tone } from "@/pages/Tone"
import { Genre } from "@/pages/Genre"
import { Topic } from "@/pages/Topic"
import { SuggestedClips } from "@/pages/SuggestedClips"
import { Clips } from "@/pages/Clips"
import { ClipDetail } from "@/pages/ClipDetail"
import { Playlists } from "@/pages/Playlists"
import { PlaylistDetail } from "@/pages/PlaylistDetail"
import { CurationGroup } from "@/pages/CurationGroup"
import { EpisodeFeedSXM } from "@/pages/EpisodeFeedSXM"
import { OnDemandEpisodes } from "@/pages/OnDemandEpisodes"
import { TrackedPodcasts } from "@/pages/TrackedPodcasts"
import { EpisodeDetail } from "@/pages/EpisodeDetail"
import { DailyClips } from "@/pages/DailyClips"

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
        <Route path="tone" element={<Tone />} />
        <Route path="topic" element={<Topic />} />
        <Route path="genre" element={<Genre />} />
        <Route path="clips" element={<Clips />} />
        <Route path="clips/:id" element={<ClipDetail />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlists/:id" element={<PlaylistDetail />} />
        <Route path="curation-group" element={<CurationGroup />} />
        <Route path="feed-sxm" element={<EpisodeFeedSXM />} />
        <Route path="on-demand-episodes" element={<Navigate to="/dashboard/on-demand-episodes/page/1" replace />} />
        <Route path="on-demand-episodes/page/:pageIndex" element={<OnDemandEpisodes />} />
        <Route path="tracked-podcasts" element={<TrackedPodcasts />} />
        <Route path="daily-clips" element={<DailyClips />} />
        <Route path="episodes/details/:id" element={<EpisodeDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard/suggested-clips" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/suggested-clips" replace />} />
    </Routes>
  )
}

export default App
