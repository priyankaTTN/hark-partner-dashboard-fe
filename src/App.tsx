import { Routes, Route, Navigate, useParams } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Tone } from "@/pages/Tone"
import { Genre } from "@/pages/Genre"
import { Topic } from "@/pages/Topic"
import { ClipSuggestions } from "@/components/ClipSuggestions"
import { Clips } from "@/pages/Clips"
import { ClipDetail } from "@/pages/ClipDetail"
import { Playlists } from "@/pages/Playlists"
import { PlaylistDetail } from "@/pages/PlaylistDetail"
import { CurationGroup } from "@/pages/CurationGroup"
import { EpisodeFeedSXM } from "@/pages/EpisodeFeedSXM"
import { OnDemandEpisodes } from "@/pages/OnDemandEpisodes"
import { TrackedPodcasts } from "@/pages/TrackedPodcasts"
import { EpisodeDetail } from "@/pages/EpisodeDetail"
import { TranscriptDetail } from "@/pages/TranscriptDetail"
import { AddClipsContainer } from "@/containers/AddClipsContainer"

/** Redirects /transcript-detail/:podcastSlug/:episodeSlug to dashboard path. */
function RedirectTranscriptDetail() {
  const { podcastSlug, episodeSlug } = useParams<{ podcastSlug: string; episodeSlug: string }>()
  return <Navigate to={`/dashboard/transcript-detail/${podcastSlug ?? ""}/${episodeSlug ?? ""}`} replace />
}

/** Redirects /transcript-detail/keyword/:keyword to dashboard path. */
function RedirectTranscriptKeyword() {
  const { keyword } = useParams<{ keyword: string }>()
  return <Navigate to={`/dashboard/transcript-detail/keyword/${keyword ?? ""}`} replace />
}

/** Redirects /transcript-detail/sxm/:podcastSlug/:episodeSlug to dashboard path. */
function RedirectTranscriptSxm() {
  const { podcastSlug, episodeSlug } = useParams<{ podcastSlug: string; episodeSlug: string }>()
  return <Navigate to={`/dashboard/transcript-detail/sxm/${podcastSlug ?? ""}/${episodeSlug ?? ""}`} replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/transcript-detail/keyword/:keyword" element={<RedirectTranscriptKeyword />} />
      <Route path="/transcript-detail/sxm/:podcastSlug/:episodeSlug" element={<RedirectTranscriptSxm />} />
      <Route path="/transcript-detail/:podcastSlug/:episodeSlug" element={<RedirectTranscriptDetail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/suggested-clips" replace />} />
        <Route path="suggested-clips" element={<ClipSuggestions />} />
        <Route path="tone" element={<Tone />} />
        <Route path="topic" element={<Topic />} />
        <Route path="genre" element={<Genre />} />
        <Route path="clips" element={<Clips />} />
        <Route path="clips/:id" element={<ClipDetail />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlists/:id" element={<PlaylistDetail />} />
        <Route path="add-clip" element={<AddClipsContainer />} />
        <Route path="add-clip/:playlist" element={<AddClipsContainer />} />
        <Route path="curation-group" element={<CurationGroup />} />
        <Route path="feed-sxm" element={<EpisodeFeedSXM />} />
        <Route path="on-demand-episodes" element={<Navigate to="/dashboard/on-demand-episodes/page/1" replace />} />
        <Route path="on-demand-episodes/page/:pageIndex" element={<OnDemandEpisodes />} />
        <Route path="tracked-podcasts" element={<TrackedPodcasts />} />
        <Route path="episodes/details/:id" element={<EpisodeDetail />} />
        <Route path="transcript-detail/keyword/:keyword" element={<TranscriptDetail />} />
        <Route path="transcript-detail/sxm/:podcastSlug/:episodeSlug" element={<TranscriptDetail />} />
        <Route path="transcript-detail/:podcastSlug/:episodeSlug" element={<TranscriptDetail />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard/suggested-clips" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/suggested-clips" replace />} />
    </Routes>
  )
}

export default App
