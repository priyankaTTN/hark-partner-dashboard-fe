import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getSxmLatestPodcast, fetchAllCurationGroups, type SxmEpisodeItem, type CurationGroupItem } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { Info } from "lucide-react"

const SEARCH_DEBOUNCE_MS = 500

export function EpisodeFeedSXM() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [episodes, setEpisodes] = useState<SxmEpisodeItem[]>([])
  const [nextOffset, setNextOffset] = useState<number | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadMoreLoading, setLoadMoreLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState(() => searchParams.get("qs") ?? "")
  const [podcastText, setPodcastText] = useState(() => searchParams.get("podcastqs") ?? "")
  const [curationGroupId, setCurationGroupId] = useState(() => searchParams.get("curationGroupId") ?? "")
  const [curationGroups, setCurationGroups] = useState<CurationGroupItem[]>([])
  const [tooltipEpisode, setTooltipEpisode] = useState<string | null>(null)

  const debouncedQs = useDebounceValue(searchText.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedPodcastQs = useDebounceValue(podcastText.trim(), SEARCH_DEBOUNCE_MS)

  const hasFilters = Boolean(debouncedQs || debouncedPodcastQs || curationGroupId)

  const updateFiltersInUrl = useCallback(
    (updates: { qs?: string; podcastqs?: string; curationGroupId?: string }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (updates.qs !== undefined) (updates.qs ? next.set("qs", updates.qs) : next.delete("qs"))
        if (updates.podcastqs !== undefined) (updates.podcastqs ? next.set("podcastqs", updates.podcastqs) : next.delete("podcastqs"))
        if (updates.curationGroupId !== undefined) (updates.curationGroupId ? next.set("curationGroupId", updates.curationGroupId) : next.delete("curationGroupId"))
        return next
      })
    },
    [setSearchParams]
  )

  useEffect(() => {
    updateFiltersInUrl({ qs: debouncedQs || undefined, podcastqs: debouncedPodcastQs || undefined, curationGroupId: curationGroupId || undefined })
  }, [debouncedQs, debouncedPodcastQs, curationGroupId, updateFiltersInUrl])

  const fetchEpisodes = useCallback(
    async (append: boolean, offset?: number) => {
      if (append) setLoadMoreLoading(true)
      else setLoading(true)
      setError(null)
      try {
        const opts: Parameters<typeof getSxmLatestPodcast>[0] = {}
        if (hasFilters) {
          if (debouncedQs) opts.qs = debouncedQs
          if (debouncedPodcastQs) opts.podcastqs = debouncedPodcastQs
          if (curationGroupId) opts.curationGroupId = curationGroupId
        } else {
          opts.daysOffset = offset ?? 0
          opts.offset = offset ?? 0
        }
        const res = await getSxmLatestPodcast(opts)
        const newList = res.episodes ?? []
        if (append) {
          setEpisodes((prev) => [...prev, ...newList])
        } else {
          setEpisodes(newList)
        }
        setNextOffset(res.nextOffset)
        setHasMore(res.hasMore ?? false)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        if (!append) setEpisodes([])
      } finally {
        if (append) setLoadMoreLoading(false)
        else setLoading(false)
      }
    },
    [debouncedQs, debouncedPodcastQs, curationGroupId, hasFilters]
  )

  useEffect(() => {
    const offset = hasFilters ? undefined : 0
    fetchEpisodes(false, offset)
  }, [fetchEpisodes, hasFilters])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchAllCurationGroups()
        if (!cancelled) setCurationGroups(Array.isArray(data) ? data : [])
      } catch {
        // ignore
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleLoadMore = () => {
    if (hasFilters || nextOffset == null) return
    fetchEpisodes(true, nextOffset)
  }

  const goToTranscript = (ep: SxmEpisodeItem) => {
    const slug = ep.podcastSlug
    const eslug = ep.episodeSlug
    if (slug && eslug) navigate(`/dashboard/transcript-detail/sxm/${slug}/${eslug}`)
  }

  if (loading && episodes.length === 0) {
    return <LoadingState message="Loading episode feed…" />
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Input
              type="search"
              placeholder="Search by episode title..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-3"
              aria-label="Episode title search"
            />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Input
              type="search"
              placeholder="Search by podcast title..."
              value={podcastText}
              onChange={(e) => setPodcastText(e.target.value)}
              className="pr-3"
              aria-label="Podcast title search"
            />
          </div>
          <div className="w-full sm:w-auto min-w-[180px]">
            <Select value={curationGroupId || "all"} onValueChange={(v) => setCurationGroupId(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Curation group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curation Groups</SelectItem>
                {curationGroups.map((g) => (
                  <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4 overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Podcast</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Published Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Insertion Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {episodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No episodes found
                </td>
              </tr>
            ) : (
              episodes.map((ep) => (
                <tr key={`${ep.podcastSlug}-${ep.episodeSlug}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      type="button"
                      className="cursor-pointer linkStyle text-left"
                      onClick={() => goToTranscript(ep)}
                    >
                      {ep.name ?? "—"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 relative">
                    {ep.description ? (
                      <>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-700"
                          onMouseEnter={() => setTooltipEpisode(`${ep.podcastSlug}-${ep.episodeSlug}`)}
                          onMouseLeave={() => setTooltipEpisode(null)}
                          aria-label="Description"
                        >
                          <Info className="size-4" />
                        </button>
                        {tooltipEpisode === `${ep.podcastSlug}-${ep.episodeSlug}` && (
                          <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 max-w-xs p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                            {ep.description}
                          </div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{ep.podcast_name ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatTime(ep.duration)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        (ep as { generateTranscriptStatus?: string }).generateTranscriptStatus === "ready"
                          ? "bg-green-100 text-green-800"
                          : (ep as { generateTranscriptStatus?: string }).generateTranscriptStatus === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {(ep as { generateTranscriptStatus?: string }).generateTranscriptStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate((ep as { pubDate?: string | number }).pubDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate((ep as { creationDate?: string | number }).creationDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hasFilters && hasMore && (
        <div className="mt-4 flex justify-center">
          <Button onClick={handleLoadMore} disabled={loadMoreLoading}>
            {loadMoreLoading ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}
