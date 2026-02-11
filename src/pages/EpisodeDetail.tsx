import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  fetchPodcastDetail,
  getPodcastEpisodesFromRss,
  downloadEpisodesToS3,
  type EpisodeDetailItem,
  type PodcastEpisodesResponse,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { formatDate } from "@/lib/utils"
import { ChevronLeft, Download } from "lucide-react"

const DESCRIPTION_MAX = 100

function truncateDescription(desc: string | undefined): string {
  if (desc == null || String(desc).trim() === "") return "No description available"
  const s = String(desc).trim()
  if (s.length <= DESCRIPTION_MAX) return s
  return s.slice(0, DESCRIPTION_MAX) + "…"
}

function episodeDisplayName(ep: EpisodeDetailItem): string {
  const name = ep.name ?? ep.title
  return (name != null && String(name).trim() !== "") ? String(name).trim() : "Untitled"
}

export function EpisodeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [episodeDetails, setEpisodeDetails] = useState<PodcastEpisodesResponse | null>(
    (location.state as { episodeDetails?: PodcastEpisodesResponse } | null)?.episodeDetails ?? null
  )
  const [loading, setLoading] = useState(!episodeDetails && !!id)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [episodeDownload, setEpisodeDownload] = useState<EpisodeDetailItem[]>([])
  const [downloadSubmitting, setDownloadSubmitting] = useState(false)

  const refetchEpisodeDetails = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const podcast = await fetchPodcastDetail(id)
      const href = podcast?.href
      if (!href) {
        setError("Podcast has no RSS href")
        setEpisodeDetails({ title: podcast?.title ?? "Unknown", podcasts: [] })
        return
      }
      const data = await getPodcastEpisodesFromRss(href)
      setEpisodeDetails({ title: data.title, podcasts: data.podcasts })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEpisodeDetails(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (episodeDetails != null && id) return
    if (!id) {
      setError("Missing podcast id")
      setLoading(false)
      return
    }
    refetchEpisodeDetails()
  }, [id, refetchEpisodeDetails, episodeDetails])

  const filteredEpisodes = (episodeDetails?.podcasts ?? []).filter((ep) => {
    const name = (ep.name ?? ep.title ?? "").toString().toLowerCase()
    return name.includes(searchTerm.toLowerCase().trim())
  })

  const handleEpisodeClick = (episode: EpisodeDetailItem) => {
    const slug = episode.podcastSlug ?? ""
    const eslug = episode.episodeSlug ?? ""
    if (slug && eslug) navigate(`/dashboard/transcript-detail/${slug}/${eslug}`)
  }

  const isEpisodeInDownload = (episode: EpisodeDetailItem) =>
    episodeDownload.some(
      (e) =>
        (e._id && episode._id && e._id === episode._id) ||
        (e.episodeSlug === episode.episodeSlug && e.podcastSlug === episode.podcastSlug)
    )

  const toggleEpisodeDownload = (episode: EpisodeDetailItem) => {
    if (episode.s3audioUrl) return
    setEpisodeDownload((prev) =>
      isEpisodeInDownload(episode)
        ? prev.filter(
            (e) =>
              (e._id !== episode._id || e.episodeSlug !== episode.episodeSlug || e.podcastSlug !== episode.podcastSlug)
          )
        : [...prev, episode]
    )
  }

  const handleDownload = async () => {
    if (episodeDownload.length === 0) return
    setDownloadSubmitting(true)
    try {
      await downloadEpisodesToS3({ ids: episodeDownload })
      setEpisodeDownload([])
      await refetchEpisodeDetails()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadSubmitting(false)
    }
  }

  if (loading && !episodeDetails) {
    return <LoadingState message="Loading episode detail…" />
  }

  return (
    <div className="flex flex-col pb-6 animate-in fadeIn duration-200">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2"
          onClick={() => navigate("/dashboard/tracked-podcasts")}
        >
          <ChevronLeft className="size-4" />
          Back to Tracked Podcasts
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      {!episodeDetails ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-8 text-center text-gray-600">
          No episode details available.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Podcasts: {episodeDetails.title || "Untitled"}
              </h2>
              <Button
                onClick={handleDownload}
                disabled={episodeDownload.length === 0 || downloadSubmitting}
                className="gap-2"
              >
                <Download className="size-4" />
                {downloadSubmitting ? "Downloading…" : "Download Episode"}
              </Button>
            </div>
          </div>

          <div className="mb-3">
            <Input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Episode List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Download
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Created Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEpisodes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No podcasts found matching your search
                      </td>
                    </tr>
                  ) : (
                    filteredEpisodes.map((episode, index) => (
                      <tr key={episode._id ?? `${episode.podcastSlug}-${episode.episodeSlug}` ?? `ep-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">
                          <button
                            type="button"
                            className="cursor-pointer linkStyle text-left"
                            onClick={() => handleEpisodeClick(episode)}
                          >
                            {episodeDisplayName(episode)}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          <span className="line-clamp-2">
                            {truncateDescription(episode.description)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {episode.artistName ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <input
                            type="checkbox"
                            checked={!!episode.s3audioUrl || isEpisodeInDownload(episode)}
                            disabled={!!episode.s3audioUrl}
                            onChange={() => toggleEpisodeDownload(episode)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            aria-label={episode.s3audioUrl ? "Already downloaded" : "Select for download"}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(episode.createdAt ?? episode.pubDate) === "—"
                            ? "Unknown"
                            : formatDate(episode.createdAt ?? episode.pubDate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
