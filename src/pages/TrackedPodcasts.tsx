import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  getPodcastTranscript,
  fetchAllCurationGroups,
  getCategoryClipSuggestionsData,
  attachCurationGroupsToPodcast,
  editPodcastTranscriptPromptCategory,
  deletePodcastTranscript,
  addPodcastTranscript,
  type TrackedPodcastItem,
  type CurationGroupItem,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { Link2, Pencil, Trash2, Plus } from "lucide-react"
import { CreatableMultiSelect, mapToCreatableOptions, getSelectedOptions } from "@/components/CreatableMultiSelect"

type SortOrder = "asc" | "desc"

export function TrackedPodcasts() {
  const navigate = useNavigate()
  const [list, setList] = useState<TrackedPodcastItem[]>([])
  const [curationGroups, setCurationGroups] = useState<CurationGroupItem[]>([])
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [curationGroupId, setCurationGroupId] = useState<string>("")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  const [showAttachModal, setShowAttachModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [attachPodcastId, setAttachPodcastId] = useState<string | null>(null)
  const [attachSelectedIds, setAttachSelectedIds] = useState<string[]>([])
  const [editPodcastId, setEditPodcastId] = useState<string | null>(null)
  const [editCategoryId, setEditCategoryId] = useState("")
  const [deletePodcastId, setDeletePodcastId] = useState<string | null>(null)
  const [addPayload, setAddPayload] = useState({ podcastId: "", podcastSlug: "", podcastType: "internal" as "internal" | "external", aiClipSuggestionCategory: "" })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [episodeNavLoading, setEpisodeNavLoading] = useState(false)

  const loadTranscript = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPodcastTranscript(curationGroupId ? { curationGroupId } : undefined)
      const nextList = Array.isArray(res.transcriptList) ? res.transcriptList : []
      setList(nextList)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setList([])
    } finally {
      setLoading(false)
    }
  }, [curationGroupId])

  const loadCurationGroups = useCallback(async () => {
    try {
      const data = await fetchAllCurationGroups()
      setCurationGroups(Array.isArray(data) ? data : [])
    } catch {
      // ignore
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategoryClipSuggestionsData()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadTranscript()
  }, [loadTranscript])

  useEffect(() => {
    loadCurationGroups()
    loadCategories()
  }, [loadCurationGroups, loadCategories])

  const sortedList = [...list].sort((a, b) => {
    const ta = (a.title ?? "").toLowerCase()
    const tb = (b.title ?? "").toLowerCase()
    return sortOrder === "asc" ? ta.localeCompare(tb) : tb.localeCompare(ta)
  })

  const moveToEpisode = (item: TrackedPodcastItem) => {
    setEpisodeNavLoading(true)
    try {
      navigate(`/dashboard/episodes/details/${item._id}`)
    } catch {
      setEpisodeNavLoading(false)
    }
  }

  const openAttach = (item: TrackedPodcastItem) => {
    setAttachPodcastId(item._id)
    const existing = (item.curationGroups ?? []).map((g) => (typeof g === "string" ? g : g._id))
    setAttachSelectedIds(existing)
    setShowAttachModal(true)
  }

  const handleAttachOk = async () => {
    if (!attachPodcastId) return
    setSubmitLoading(true)
    try {
      await attachCurationGroupsToPodcast({ podcastId: attachPodcastId, curationGroupIds: attachSelectedIds })
      setShowAttachModal(false)
      setAttachPodcastId(null)
      setAttachSelectedIds([])
      await loadTranscript()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const openEdit = (item: TrackedPodcastItem) => {
    setEditPodcastId(item._id)
    setEditCategoryId((item.aiClipSuggestionCategory as string) ?? "")
    setShowEditModal(true)
  }

  const handleEditOk = async () => {
    if (!editPodcastId) return
    setSubmitLoading(true)
    try {
      await editPodcastTranscriptPromptCategory(editPodcastId, editCategoryId)
      setShowEditModal(false)
      setEditPodcastId(null)
      setEditCategoryId("")
      await loadTranscript()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const openDelete = (item: TrackedPodcastItem) => {
    setDeletePodcastId(item._id)
    setShowDeleteModal(true)
  }

  const handleDeleteOk = async () => {
    if (!deletePodcastId) return
    setSubmitLoading(true)
    try {
      await deletePodcastTranscript(deletePodcastId)
      setShowDeleteModal(false)
      setDeletePodcastId(null)
      await loadTranscript()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleAddOk = async () => {
    const payload = {
      ...addPayload,
      podcastId: addPayload.podcastId || undefined,
      podcastSlug: addPayload.podcastSlug || undefined,
      aiClipSuggestionCategory: addPayload.aiClipSuggestionCategory || undefined,
    }
    if (!payload.podcastId && !payload.podcastSlug) return
    setSubmitLoading(true)
    try {
      await addPodcastTranscript(payload)
      setShowAddModal(false)
      setAddPayload({ podcastId: "", podcastSlug: "", podcastType: "internal", aiClipSuggestionCategory: "" })
      await loadTranscript()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitLoading(false)
    }
  }

  const curationOptions = mapToCreatableOptions(curationGroups)
  const attachSelectedOptions = getSelectedOptions(curationOptions, attachSelectedIds)

  if (loading && list.length === 0) {
    return <LoadingState message="Loading tracked podcasts…" />
  }

  return (
    <div className="flex flex-col pb-6 relative">
      {episodeNavLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <LoadingState message="Loading episode detail…" />
        </div>
      )}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Select value={curationGroupId || "all"} onValueChange={(v) => setCurationGroupId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Curation group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curation Groups</SelectItem>
                {curationGroups.map((g) => (
                  <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
            >
              Sort by title {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="size-4" />
              Add Podcast
            </Button>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Id</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Prompt Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Curation Groups</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No tracked podcasts found
                </td>
              </tr>
            ) : (
              sortedList.map((m) => (
                <tr key={m._id} className="hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50/70">
                  <td className="px-6 py-4 text-sm text-gray-600">{m._id}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      type="button"
                      className="cursor-pointer linkStyle text-left disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => moveToEpisode(m)}
                      disabled={episodeNavLoading}
                    >
                      {m.title ?? "—"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {categories.find((c) => c._id === m.aiClipSuggestionCategory)?.name ?? m.aiClipSuggestionCategory ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {Array.isArray(m.curationGroups)
                      ? (m.curationGroups as Array<{ _id?: string; name?: string } | string>)
                          .map((g) => (typeof g === "string" ? g : g.name ?? g._id ?? ""))
                          .filter(Boolean)
                          .join(", ") || "—"
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button
                      type="button"
                      onClick={() => openAttach(m)}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      aria-label="Attach curation groups"
                    >
                      <Link2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      aria-label="Edit category"
                    >
                      <Pencil className="size-4" />
                    </button>
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

      {/* Attach Curation Groups Modal */}
      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Curation Groups</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Curation Groups</Label>
            <CreatableMultiSelect
              options={curationOptions}
              value={attachSelectedOptions}
              onChangeIds={setAttachSelectedIds}
              placeholder="Select curation groups..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleAttachOk} disabled={submitLoading}>
              {submitLoading ? "Saving…" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Category Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Prompt Category</Label>
            <Select value={editCategoryId || "none"} onValueChange={setEditCategoryId}>
              <SelectTrigger id="edit-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditOk} disabled={submitLoading}>
              {submitLoading ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Podcast</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to stop tracking this podcast?</p>
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

      {/* Add Podcast Modal — spec §6.4: Internal/External radio, category Select, Submit */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Podcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Podcast type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="podcastType"
                    checked={addPayload.podcastType === "internal"}
                    onChange={() => setAddPayload((p) => ({ ...p, podcastType: "internal" }))}
                    className="rounded-full border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Internal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="podcastType"
                    checked={addPayload.podcastType === "external"}
                    onChange={() => setAddPayload((p) => ({ ...p, podcastType: "external" }))}
                    className="rounded-full border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">External</span>
                </label>
              </div>
            </div>
            {addPayload.podcastType === "internal" ? (
              <div className="space-y-2">
                <Label htmlFor="add-podcast-id">Podcast ID</Label>
                <Input
                  id="add-podcast-id"
                  value={addPayload.podcastId}
                  onChange={(e) => setAddPayload((p) => ({ ...p, podcastId: e.target.value }))}
                  placeholder="Internal podcast ID"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="add-podcast-slug">Podcast Slug</Label>
                <Input
                  id="add-podcast-slug"
                  value={addPayload.podcastSlug}
                  onChange={(e) => setAddPayload((p) => ({ ...p, podcastSlug: e.target.value }))}
                  placeholder="External podcast slug"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-category">Prompt Category</Label>
              <Select
                value={addPayload.aiClipSuggestionCategory || "none"}
                onValueChange={(v) => setAddPayload((p) => ({ ...p, aiClipSuggestionCategory: v === "none" ? "" : v }))}
              >
                <SelectTrigger id="add-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOk}
              disabled={
                submitLoading ||
                (addPayload.podcastType === "internal" ? !addPayload.podcastId : !addPayload.podcastSlug)
              }
            >
              {submitLoading ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
