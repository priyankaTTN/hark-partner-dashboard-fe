import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import useDebounce from "@/customHook/useDebounce"
import {
  getEpisodeTranscriptList,
  requestEpisodeTranscript,
  deleteEpisodeTranscript,
  type OnDemandEpisodeItem,
} from "@/lib/api"
import { formatDate, formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { TablePagination } from "@/components/TablePagination"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { Info, Trash2 } from "lucide-react"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 500

export function OnDemandEpisodes() {
  const navigate = useNavigate()
  const { pageIndex } = useParams<{ pageIndex?: string }>()
  const currentPage = Math.max(1, parseInt(pageIndex ?? "1", 10) || 1)

  const [episodeList, setEpisodeList] = useState<OnDemandEpisodeItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [episodeQuery, setEpisodeQuery] = useState("")
  const [podcastQuery, setPodcastQuery] = useState("")
  const [userNameQuery, setUserNameQuery] = useState("")
  const debouncedQs = useDebounce(episodeQuery.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedPodcastQs = useDebounce(podcastQuery.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedUserQs = useDebounce(userNameQuery.trim(), SEARCH_DEBOUNCE_MS)

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getEpisodeTranscriptList(currentPage, PAGE_SIZE, {
        qs: debouncedQs || undefined,
        podcastqs: debouncedPodcastQs || undefined,
        userNameqs: debouncedUserQs || undefined,
      })
      setEpisodeList(res.episodeList ?? [])
      setTotalItems(res.totalItems ?? 0)
      setTotalPages(res.totalPages ?? 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEpisodeList([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedQs, debouncedPodcastQs, debouncedUserQs])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handlePageChange = (page: number) => {
    navigate(`/dashboard/on-demand-episodes/page/${page}`)
  }

  const moveToEpisode = (item: OnDemandEpisodeItem) => {
    const slug = item.podcastSlug
    const eslug = item.episodeSlug
    if (slug && eslug) navigate(`/dashboard/transcript-detail/${slug}/${eslug}`)
  }

  const handleRequestTranscript = async () => {
    setSubmitLoading(true)
    try {
      await requestEpisodeTranscript(
        {
          podcast_name: "",
          name: "",
          _id: "",
          podcastSlug: "",
          episodeSlug: "",
        },
        false
      )
      setShowRequestModal(false)
      await fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const openDelete = (item: OnDemandEpisodeItem) => {
    setDeleteId(item._id)
    setShowDeleteModal(true)
  }

  const handleDeleteOk = async () => {
    if (!deleteId) return
    setSubmitLoading(true)
    try {
      await deleteEpisodeTranscript(deleteId)
      setShowDeleteModal(false)
      setDeleteId(null)
      await fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = Math.min((currentPage - 1) * PAGE_SIZE + episodeList.length, totalItems)

  if (loading && episodeList.length === 0) {
    return <LoadingState message="Loading on-demand episodes…" />
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <Button onClick={() => setShowRequestModal(true)}>Request Transcript</Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Input
              type="search"
              placeholder="Search by episode title..."
              value={episodeQuery}
              onChange={(e) => setEpisodeQuery(e.target.value)}
              aria-label="Episode title search"
            />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Input
              type="search"
              placeholder="Search by podcast title..."
              value={podcastQuery}
              onChange={(e) => setPodcastQuery(e.target.value)}
              aria-label="Podcast title search"
            />
          </div>
          <div className="relative flex-1 max-w-sm">
            <Input
              type="search"
              placeholder="Search by requested by..."
              value={userNameQuery}
              onChange={(e) => setUserNameQuery(e.target.value)}
              aria-label="User name search"
            />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Podcast</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Requested Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {episodeList.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No on-demand episodes found
                </td>
              </tr>
            ) : (
              episodeList.map((m) => (
                <tr key={m._id} className="hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50/70">
                  <td className="px-6 py-4">
                    {m.image ? (
                      <img src={m.image} alt="" className="h-10 w-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      type="button"
                      className="cursor-pointer linkStyle text-left"
                      onClick={() => moveToEpisode(m)}
                    >
                      {m.name ?? "—"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 relative">
                    {m.description ? (
                      <>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-700"
                          onMouseEnter={() => setTooltipId(m._id)}
                          onMouseLeave={() => setTooltipId(null)}
                          aria-label="Description"
                        >
                          <Info className="size-4" />
                        </button>
                        {tooltipId === m._id && (
                          <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 max-w-xs p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                            {m.description}
                          </div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.podcast_name ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {formatTime(m.duration)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(m.transcriptRequestDateTime)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{m.transcriptRequestedBy ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        m.generateTranscriptStatus === "ready"
                          ? "bg-green-100 text-green-800"
                          : m.generateTranscriptStatus === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.generateTranscriptStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => openDelete(m)}
                      className="text-gray-600 hover:text-red-600 p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        startIndex={startIndex}
        endIndex={endIndex}
        total={totalItems}
        itemLabel="episodes"
      />

      {/* Request Transcript Modal — simplified; full podcast/episode search can be wired later */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Transcript</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Use internal or external podcast search to select a podcast and episode, then request a transcript.
            (Podcast and episode search can be wired to API here.)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleRequestTranscript} disabled={submitLoading}>
              {submitLoading ? "Submitting…" : "Transcript"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transcript</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to remove this episode from the on-demand list?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOk} disabled={submitLoading}>
              {submitLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
