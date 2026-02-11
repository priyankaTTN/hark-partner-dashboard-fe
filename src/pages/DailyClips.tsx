import { useState, useCallback, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  fetchVoiceHarkClips,
  fetchHarkVoiceCategories,
  updateVoiceHarkClip,
  reorderVoiceHarkClips,
  type VoiceHarkClipsResponse,
  type AnswerListItem,
  type HarkVoiceCategory,
} from "@/lib/api"
import { WEB_URL, STAGE_URL } from "@/config/constant"
import { formatDate } from "@/lib/utils"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, ExternalLink, ArrowLeftRight, Trash2, ChevronDown, ChevronUp } from "lucide-react"

const FIRST_CLIPS_LABEL = "First Clips"

/** Sort category names: "First Clips" first, then alphabetically (case-insensitive). */
function sortCategoryNames(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    if (a === FIRST_CLIPS_LABEL) return -1
    if (b === FIRST_CLIPS_LABEL) return 1
    return a.localeCompare(b, undefined, { sensitivity: "base" })
  })
}

/** Get audioUrl from clip (spec: S3 badge when audioUrl starts with STAGE_URL). */
function getClipAudioUrl(item: AnswerListItem): string | undefined {
  return (item as { audioUrl?: string }).audioUrl ?? (item.customAttributes as { podcast?: { s3audioUrl?: string } })?.podcast?.s3audioUrl
}

function ClipTableRow({
  item,
  onMove,
  onDelete,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  item: AnswerListItem
  onMove: (clip: AnswerListItem) => void
  onDelete: (clip: AnswerListItem) => void
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const audioUrl = getClipAudioUrl(item)
  const showS3Badge = audioUrl?.startsWith(STAGE_URL)
  const tags = item.tags ?? []
  const tagList = tags.map((t) => (typeof t === "object" && t && "_id" in t ? { _id: (t as { _id: string })._id, name: (t as { name?: string }).name ?? "" } : null)).filter(Boolean) as { _id: string; name?: string }[]

  return (
    <tr
      className="hover:bg-gray-50 transition-colors border-b border-gray-100"
      draggable
      onDragStart={(e) => onDragStart(e)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <td className="px-6 py-4 text-sm text-gray-600 align-top cursor-grab active:cursor-grabbing">
        <GripVertical className="size-4 inline-block mr-1" aria-hidden />
        {item._id}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        <Link
          to={`/dashboard/clips/${item._id}`}
          className="text-primary hover:underline"
        >
          {item.title ?? item._id}
        </Link>
        {showS3Badge && (
          <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            S3
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {item.href ? (
          <a
            href={`${WEB_URL}/${item.href}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="size-4" />
            View on Web
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {(item.question as { hidden?: string })?.hidden ?? "—"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {(item.question as { title?: string })?.title ?? "—"}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {formatDate(item.creationDate, true)}
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex flex-wrap gap-1">
          {tagList.map((tag) => (
            <Link
              key={tag._id}
              to={`/dashboard/tags/detail/${tag._id}`}
              className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 hover:bg-gray-200"
            >
              {tag.name ?? tag._id}
            </Link>
          ))}
          {tagList.length === 0 && "—"}
        </div>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(item)}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            title="Move to category"
            aria-label="Move to category"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-1.5 rounded text-gray-600 hover:bg-destructive/10 hover:text-destructive"
            title="Remove from Daily Clips"
            aria-label="Remove from Daily Clips"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function DailyClips() {
  const [apiData, setApiData] = useState<VoiceHarkClipsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({})
  const [categoryChanges, setCategoryChanges] = useState<Record<string, boolean>>({})
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedMoveClip, setSelectedMoveClip] = useState<AnswerListItem | null>(null)
  const [selectedMoveCategoryId, setSelectedMoveCategoryId] = useState<string>("")
  const [categories, setCategories] = useState<HarkVoiceCategory[]>([])
  const [draggedItem, setDraggedItem] = useState<{ category: string; index: number } | null>(null)
  /** Ref so reorder logic always uses current drag-from index (avoids stale closure in setApiData). */
  const dragFromIndexRef = useRef<number | null>(null)

  const loadClips = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchVoiceHarkClips({})
      setApiData(data ?? {})
      setAccordionOpen((prev) => {
        const next = { ...prev }
        Object.keys(data ?? {}).forEach((cat) => {
          if (next[cat] === undefined) next[cat] = true
        })
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const list = await fetchHarkVoiceCategories()
      setCategories(Array.isArray(list) ? list : [])
    } catch {
      setCategories([])
    }
  }, [])

  useEffect(() => {
    loadClips()
    loadCategories()
  }, [loadClips, loadCategories])

  const categoryNames = apiData ? sortCategoryNames(Object.keys(apiData)) : []

  const toggleAccordion = (category: string) => {
    setAccordionOpen((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const handleDragStart = (e: React.DragEvent, category: string, index: number, clipId: string) => {
    setDraggedItem({ category, index })
    dragFromIndexRef.current = index
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", clipId)
  }

  const handleDragOver = (e: React.DragEvent, category: string, overIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (!draggedItem || draggedItem.category !== category) return
    const fromIndex = dragFromIndexRef.current ?? draggedItem.index
    if (fromIndex === overIndex) return
    setApiData((prev) => {
      if (!prev) return prev
      const clips = [...(prev[category] ?? [])]
      const [removed] = clips.splice(fromIndex, 1)
      clips.splice(overIndex, 0, removed)
      dragFromIndexRef.current = overIndex
      return { ...prev, [category]: clips }
    })
    setCategoryChanges((prev) => ({ ...prev, [category]: true }))
    setDraggedItem((prev) => (prev ? { ...prev, index: overIndex } : null))
  }

  const handleDragEnd = () => {
    dragFromIndexRef.current = null
    setDraggedItem(null)
  }

  const handleSaveOrder = async (category: string) => {
    const clips = apiData?.[category] ?? []
    const clipIds = clips.map((c) => c._id)
    try {
      await reorderVoiceHarkClips(clipIds)
      await loadClips()
      setCategoryChanges((prev) => ({ ...prev, [category]: false }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const openMoveModal = (clip: AnswerListItem) => {
    setSelectedMoveClip(clip)
    setSelectedMoveCategoryId("")
    setMoveModalOpen(true)
  }

  const handleMoveConfirm = async () => {
    if (!selectedMoveClip || !selectedMoveCategoryId) return
    try {
      await updateVoiceHarkClip(selectedMoveClip._id, {
        voiceHark: true,
        harkVoiceCategory: selectedMoveCategoryId,
      })
      await loadClips()
      setMoveModalOpen(false)
      setSelectedMoveClip(null)
      setSelectedMoveCategoryId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleRemove = async (item: AnswerListItem) => {
    try {
      await updateVoiceHarkClip(item._id, { voiceHark: false, harkVoiceCategory: null })
      await loadClips()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading && !apiData) {
    return <LoadingState message="Loading Daily Clips…" />
  }

  if (error && !apiData) {
    return <ErrorState message={error} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-gray-900">Daily Clips</h1>
        <p className="text-sm text-gray-600">
          Voice Hark clips grouped by category. Reorder within a category, move between categories, or remove from Daily Clips.
        </p>
      </div>

      {error && (
        <ErrorState message={error} />
      )}

      {categoryNames.length === 0 && !loading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-8 text-center text-gray-600">
          No Daily Clips yet. Add clips from the Clips list to see them here.
        </div>
      )}

      <div className="space-y-3">
        {categoryNames.map((category) => {
          const clips = apiData?.[category] ?? []
          const isOpen = accordionOpen[category] !== false
          const hasChanges = categoryChanges[category] === true

          return (
            <div
              key={category}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <div
                className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
                onClick={() => toggleAccordion(category)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-900">{category}</span>
                  {isOpen ? <ChevronUp className="size-4 text-gray-600" /> : <ChevronDown className="size-4 text-gray-600" />}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {hasChanges && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSaveOrder(category)}
                    >
                      Save Order
                    </Button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Clip Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">View on Web</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Hidden</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Harklist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tags</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clips.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            No {category} Clips Available
                          </td>
                        </tr>
                      ) : (
                        clips.map((item, index) => (
                          <ClipTableRow
                            key={item._id}
                            item={item}
                            onMove={openMoveModal}
                            onDelete={handleRemove}
                            isDragging={draggedItem?.category === category && draggedItem?.index === index}
                            onDragStart={(e) => handleDragStart(e, category, index, item._id)}
                            onDragOver={(e) => handleDragOver(e, category, index)}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent onClose={() => setMoveModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Move Clip to Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {selectedMoveClip ? (
              <>
                Move clip &quot;{selectedMoveClip.title ?? selectedMoveClip._id}&quot; to a different category:
              </>
            ) : (
              "Select a category."
            )}
          </p>
          <Select value={selectedMoveCategoryId} onValueChange={setSelectedMoveCategoryId}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {(cat as { title?: string }).title ?? (cat as { name?: string }).name ?? cat._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMoveConfirm}
              disabled={!selectedMoveCategoryId}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DailyClips
