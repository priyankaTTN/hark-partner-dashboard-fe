import { useParams, useNavigate, Link } from "react-router-dom"
import { useState, useEffect, useRef, useMemo } from "react"
import {
  getQuestionDetailUrl,
  getQuestionAnswersUrl,
  getTagsUrl,
  getGenresUrl,
  getTonesUrl,
  getColorsUrl,
  deleteQuestion,
  updateQuestion,
  setQuestionDisplay,
  setQuestionAllowSuggestion,
  saveQuestionMetaTags,
  setEntityTags,
  setEntityGenres,
  setEntityTones,
  uploadIntroOutroOrImage,
  type QuestionDetailResponse,
  type QuestionCustomAttributes,
  type AnswerClip,
  type QuestionAnswersResponse,
  type EditQuestionPayload,
  type TagGenreToneItem,
  type ColorItem,
  type TagsListResponse,
  type GenresListResponse,
  type TonesListResponse,
  type ColorsListResponse,
} from "@/lib/api"
import { WEB_URL } from "@/config/constant"
import useFetch from "@/customHook/useFetch"
import { formatDate, formatDurationHMS } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import {
  CreatableMultiSelect,
  mapToCreatableOptions,
  getSelectedOptions,
} from "@/components/CreatableMultiSelect"
import { Pencil, Trash2, Download, ChevronRight } from "lucide-react"

/** Normalize hex for CSS (ensure # prefix) */
function toHex(hex: string | undefined): string {
  if (!hex || typeof hex !== "string") return "#cccccc"
  const s = hex.replace(/^#/, "")
  return s.length >= 3 ? `#${s}` : "#cccccc"
}

/** Get ids from question tags/genres/tones (can be objects or strings) */
function getIds(list: Array<{ _id: string; name?: string } | string> | undefined): string[] {
  if (!Array.isArray(list)) return []
  return list.map((t) => (typeof t === "string" ? t : t._id)).filter(Boolean)
}

const TITLE_MAX = 75
const DESCRIPTION_MAX = 250
const META_TITLE_MAX = 70
const META_DESC_MAX = 160

export function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [editTitle, setEditTitle] = useState(false)
  const [editDescription, setEditDescription] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [displayToggling, setDisplayToggling] = useState(false)
  const [suggestionToggling, setSuggestionToggling] = useState(false)
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDesc, setMetaDesc] = useState("")
  const [metaSubmitting, setMetaSubmitting] = useState(false)
  const [imageTypeSubmitting, setImageTypeSubmitting] = useState(false)
  // Intro/Outro — spec §6
  const [introOutroEdit, setIntroOutroEdit] = useState(false)
  const [introUploading, setIntroUploading] = useState(false)
  const [outroUploading, setOutroUploading] = useState(false)
  const [introPreviewUrl, setIntroPreviewUrl] = useState<string | null>(null)
  const [outroPreviewUrl, setOutroPreviewUrl] = useState<string | null>(null)
  const [introOutroSaveSubmitting, setIntroOutroSaveSubmitting] = useState(false)
  const introAudioRef = useRef<HTMLAudioElement>(null)
  const outroAudioRef = useRef<HTMLAudioElement>(null)
  // Tags / Genres / Tones — spec §7
  const [tagIds, setTagIds] = useState<string[]>([])
  const [genreIds, setGenreIds] = useState<string[]>([])
  const [toneIds, setToneIds] = useState<string[]>([])
  const [tagsSaving, setTagsSaving] = useState(false)
  const [genresSaving, setGenresSaving] = useState(false)
  const [tonesSaving, setTonesSaving] = useState(false)
  // Color modal — spec Color section
  const [colorModalOpen, setColorModalOpen] = useState(false)
  const [colorDraft, setColorDraft] = useState<{
    color?: string
    foregroundColor?: string
    backgroundColor?: string
    clipMainColor?: string
    clipAlternativeColor?: string
  }>({})
  const [colorSaveSubmitting, setColorSaveSubmitting] = useState(false)

  const detailUrl = getQuestionDetailUrl(id, refreshKey)
  const answersUrl = getQuestionAnswersUrl(id, refreshKey)

  const { data: detailData, loading: detailLoading, error: detailError } = useFetch(detailUrl, {
    credentials: "include",
  })
  const { data: answersData, loading: answersLoading } = useFetch(answersUrl, {
    credentials: "include",
  })
  const { data: tagsData } = useFetch(getTagsUrl(), { credentials: "include" })
  const { data: genresData } = useFetch(getGenresUrl(), { credentials: "include" })
  const { data: tonesData } = useFetch(getTonesUrl(), { credentials: "include" })
  const { data: colorsData } = useFetch(getColorsUrl(), { credentials: "include" })

  const question = (detailData as QuestionDetailResponse | null) ?? null
  const answersResponse = (answersData as QuestionAnswersResponse | null) ?? null
  const answers: AnswerClip[] = answersResponse?.answers ?? []
  const totalAnswers = answersResponse?.totalAnswers ?? answersResponse?.total ?? answers.length

  const tagsList: TagGenreToneItem[] = useMemo(() => {
    const r = tagsData as TagsListResponse | null
    return r?.tags ?? r?.tagList ?? []
  }, [tagsData])
  const genresList: TagGenreToneItem[] = useMemo(() => {
    const r = genresData as GenresListResponse | null
    return r?.genres ?? r?.genreList ?? []
  }, [genresData])
  const tonesList: TagGenreToneItem[] = useMemo(() => {
    const r = tonesData as TonesListResponse | null
    return r?.tones ?? r?.toneList ?? []
  }, [tonesData])

  const tagOptions = useMemo(() => mapToCreatableOptions(tagsList), [tagsList])
  const genreOptions = useMemo(() => mapToCreatableOptions(genresList), [genresList])
  const toneOptions = useMemo(() => mapToCreatableOptions(tonesList), [tonesList])
  const colorsList: ColorItem[] = useMemo(() => {
    const r = colorsData as ColorsListResponse | null
    return r?.colors ?? r?.colorList ?? []
  }, [colorsData])

  // Sync title/description drafts from question when question loads
  useEffect(() => {
    if (question) {
      setTitleDraft(question.title ?? "")
      setDescriptionDraft(question.description ?? "")
    }
  }, [question?._id, question?.title, question?.description])

  // Sync meta fields from question (spec §16)
  useEffect(() => {
    if (question?.metaTag) {
      setMetaTitle(question.metaTag.title ?? "")
      setMetaDesc(question.metaTag.description ?? "")
    }
  }, [question?._id, question?.metaTag?.title, question?.metaTag?.description])

  // Sync tag/genre/tone selection from question
  useEffect(() => {
    if (question) {
      setTagIds(getIds(question.tags))
      setGenreIds(getIds(question.genres))
      setToneIds(getIds(question.tones))
    }
  }, [question?._id, question?.tags, question?.genres, question?.tones])

  const metaChangesMade =
    metaTitle !== (question?.metaTag?.title ?? "") ||
    metaDesc !== (question?.metaTag?.description ?? "")

  const isEmpty = !detailLoading && !detailError && (!question || !question._id)
  const loading = detailLoading
  const error = detailError

  const openDeleteConfirm = () => setConfirmDeleteOpen(true)
  const closeDeleteConfirm = () => {
    if (!deleteSubmitting) setConfirmDeleteOpen(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleteSubmitting(true)
    try {
      await deleteQuestion(id)
      closeDeleteConfirm()
      navigate("/dashboard/playlists", { replace: true })
    } catch {
      closeDeleteConfirm()
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const startEditTitle = () => {
    setTitleDraft(question?.title ?? "")
    setEditTitle(true)
  }
  const startEditDescription = () => {
    setDescriptionDraft(question?.description ?? "")
    setEditDescription(true)
  }
  const cancelEdit = () => {
    setEditTitle(false)
    setEditDescription(false)
  }

  /** Save question — spec §5: POST /api/v1/questions/:id */
  const handleSave = async () => {
    if (!id) return
    setSaveSubmitting(true)
    try {
      const payload: EditQuestionPayload = {
        allowSameNamePlaylist: question?.allowSameNamePlaylist ?? false,
        title: (titleDraft.trim() || question?.title) ?? undefined,
        description: (descriptionDraft.trim() || question?.description) ?? undefined,
      }
      await updateQuestion(id, payload)
      setEditTitle(false)
      setEditDescription(false)
      setRefreshKey((k) => k + 1)
    } finally {
      setSaveSubmitting(false)
    }
  }
  const hasEditChanges =
    editTitle ||
    editDescription ||
    titleDraft !== (question?.title ?? "") ||
    descriptionDraft !== (question?.description ?? "")

  /** Display toggle — spec §9: POST/DELETE /api/v0/questions/:id/display */
  const handleDisplayChange = async (checked: boolean) => {
    if (!id) return
    setDisplayToggling(true)
    try {
      await setQuestionDisplay(id, checked)
      setRefreshKey((k) => k + 1)
    } finally {
      setDisplayToggling(false)
    }
  }

  /** Allow suggestion toggle — spec §9: POST/DELETE /api/v0/questions/:id/allowsuggestion */
  const handleAllowSuggestionChange = async (checked: boolean) => {
    if (!id) return
    setSuggestionToggling(true)
    try {
      await setQuestionAllowSuggestion(id, checked)
      setRefreshKey((k) => k + 1)
    } finally {
      setSuggestionToggling(false)
    }
  }

  /** Meta tags submit — spec §16: POST /api/v0/dashboard/question/metaTags */
  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !metaChangesMade) return
    setMetaSubmitting(true)
    try {
      await saveQuestionMetaTags({
        id,
        title: metaTitle.trim() || undefined,
        description: metaDesc.trim() || undefined,
      })
      setRefreshKey((k) => k + 1)
    } finally {
      setMetaSubmitting(false)
    }
  }

  /** Image type — spec §21: save displayAlternateImage via POST /api/v1/questions/:id */
  const handleImageTypeChange = async (value: string) => {
    if (!id) return
    const displayAlternateImage = value === "alternative"
    setImageTypeSubmitting(true)
    try {
      await updateQuestion(id, {
        displayAlternateImage,
        allowSameNamePlaylist: question?.allowSameNamePlaylist ?? false,
      })
      setRefreshKey((k) => k + 1)
    } finally {
      setImageTypeSubmitting(false)
    }
  }

  /** Intro/Outro — spec §6: upload then save with duration from audio ref */
  const handleIntroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setIntroUploading(true)
    try {
      const { location } = await uploadIntroOutroOrImage(file)
      setIntroPreviewUrl(location)
    } finally {
      setIntroUploading(false)
      e.target.value = ""
    }
  }
  const handleOutroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setOutroUploading(true)
    try {
      const { location } = await uploadIntroOutroOrImage(file)
      setOutroPreviewUrl(location)
    } finally {
      setOutroUploading(false)
      e.target.value = ""
    }
  }
  const saveIntroOutro = async () => {
    if (!id) return
    setIntroOutroSaveSubmitting(true)
    try {
      const payload: EditQuestionPayload = { allowSameNamePlaylist: question?.allowSameNamePlaylist ?? false }
      const customAttributes: QuestionCustomAttributes = {}
      const qa = question?.customAttributes
      // Intro: new upload or keep existing
      if (introPreviewUrl) {
        const d = introAudioRef.current?.duration
        customAttributes.playlistIntro = { contentURI: introPreviewUrl, duration: Number.isFinite(d) ? d! : 0, endTime: Number.isFinite(d) ? d! : 0 }
      } else if (qa?.playlistIntro?.contentURI) {
        customAttributes.playlistIntro = {
          contentURI: qa.playlistIntro.contentURI,
          duration: qa.playlistIntro.duration ?? 0,
          endTime: qa.playlistIntro.endTime ?? 0,
        }
      }
      // Outro: new upload or keep existing
      if (outroPreviewUrl) {
        const d = outroAudioRef.current?.duration
        customAttributes.playlistOutro = { contentURI: outroPreviewUrl, duration: Number.isFinite(d) ? d! : 0, endTime: Number.isFinite(d) ? d! : 0 }
      } else if (qa?.playlistOutro?.contentURI) {
        customAttributes.playlistOutro = {
          contentURI: qa.playlistOutro.contentURI,
          duration: qa.playlistOutro.duration ?? 0,
          endTime: qa.playlistOutro.endTime ?? 0,
        }
      }
      if (customAttributes.playlistIntro !== undefined || customAttributes.playlistOutro !== undefined) {
        payload.customAttributes = customAttributes
        await updateQuestion(id, payload)
        setIntroOutroEdit(false)
        setIntroPreviewUrl(null)
        setOutroPreviewUrl(null)
        setRefreshKey((k) => k + 1)
      }
    } finally {
      setIntroOutroSaveSubmitting(false)
    }
  }
  const clearIntro = () => setIntroPreviewUrl(null)
  const clearOutro = () => setOutroPreviewUrl(null)

  /** Tags / Genres / Tones — spec §7: save selected ids (only ids that exist in API) */
  const handleSaveTags = async () => {
    if (!id) return
    setTagsSaving(true)
    try {
      await setEntityTags(id, validTagIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setTagsSaving(false)
    }
  }
  const handleSaveGenres = async () => {
    if (!id) return
    setGenresSaving(true)
    try {
      await setEntityGenres(id, validGenreIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setGenresSaving(false)
    }
  }
  const handleSaveTones = async () => {
    if (!id) return
    setTonesSaving(true)
    try {
      await setEntityTones(id, validToneIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setTonesSaving(false)
    }
  }
  /** Only persist ids that exist in the API (filter out locally "created" options until we have create API) */
  const validTagIds = useMemo(() => tagIds.filter((id) => tagsList.some((t) => t._id === id)), [tagIds, tagsList])
  const validGenreIds = useMemo(() => genreIds.filter((id) => genresList.some((g) => g._id === id)), [genreIds, genresList])
  const validToneIds = useMemo(() => toneIds.filter((id) => tonesList.some((t) => t._id === id)), [toneIds, tonesList])

  /** Normalize hex for form (strip # so Select value matches colorCode from API) */
  const norm = (hex: string | undefined) => (hex ?? "").replace(/^#/, "")

  /** Color modal — open with current question colors; OK saves draft; main Save sends colors */
  const openColorModal = () => {
    setColorDraft({
      color: norm(question?.color),
      foregroundColor: norm(question?.foregroundColor),
      backgroundColor: norm(question?.backgroundColor),
      clipMainColor: norm(question?.clipMainColor),
      clipAlternativeColor: norm(question?.clipAlternativeColor),
    })
    setColorModalOpen(true)
  }
  const applyColorDraftAndSave = async () => {
    if (!id || Object.keys(colorDraft).length === 0) return
    setColorSaveSubmitting(true)
    try {
      await updateQuestion(id, {
        ...colorDraft,
        allowSameNamePlaylist: question?.allowSameNamePlaylist ?? false,
      })
      setColorModalOpen(false)
      setRefreshKey((k) => k + 1)
    } finally {
      setColorSaveSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col pb-6">
        <LoadingState message="Loading playlist…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col pb-6">
        <ErrorState message={String(error)} />
        <Link to="/dashboard/playlists" className="mt-4 text-sm text-primary hover:underline">
          ← Back to Playlists
        </Link>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col pb-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-8 text-center text-gray-500">
          No Question Available
        </div>
        <Link to="/dashboard/playlists" className="mt-4 text-sm text-primary hover:underline">
          ← Back to Playlists
        </Link>
      </div>
    )
  }

  const viewOnWebUrl = question?.href
    ? question.href.startsWith("http")
      ? question.href
      : `${WEB_URL}${question.href.startsWith("/") ? "" : "/"}${question.href}`
    : null

  const displayChecked = question?.display !== false && !question?.hidden
  const allowSuggestionChecked = question?.allowSuggestion === true
  /** Intro/outro come from API in question.customAttributes */
  const attrs: QuestionCustomAttributes | undefined = question?.customAttributes

  return (
    <div className="flex flex-col pb-6">
      {/* Top bar: light green strip + breadcrumbs + Save Playlist (reference) */}
      <div className="bg-emerald-50/80 border-b border-gray-200 px-4 py-2 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="flex items-center gap-1 text-sm text-gray-600">
            <Link to="/dashboard" className="hover:text-gray-900">Dashboard</Link>
            <ChevronRight className="size-4 text-gray-400" />
            <Link to="/dashboard/playlists" className="hover:text-gray-900">Playlist</Link>
            <ChevronRight className="size-4 text-gray-400" />
            <span className="text-gray-900 font-medium">Playlist Detail</span>
          </nav>
          <div className="flex items-center gap-2">
            {hasEditChanges && (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saveSubmitting}>
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saveSubmitting}
            >
              {saveSubmitting ? "Saving…" : "Save Playlist"}
            </Button>
            {viewOnWebUrl && (
              <a href={viewOnWebUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">View on Web</Button>
              </a>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/add-clip/${id}`}>Add Clip</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={startEditTitle}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={openDeleteConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Playlist Title + Allow Same Name + Description (reference layout) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">Playlist Title</Label>
          <div className="relative flex items-center gap-2 max-w-xl">
            {editTitle ? (
              <>
                <Input
                  id="playlist-title"
                  maxLength={TITLE_MAX}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="flex-1 pr-8"
                  placeholder="Harklist"
                />
                <button
                  type="button"
                  onClick={() => setTitleDraft("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear"
                >
                  ×
                </button>
              </>
            ) : (
              <p className="text-lg font-medium text-gray-900">
                {question?.title ?? "Harklist"}
                <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={startEditTitle}>
                  Edit
                </Button>
              </p>
            )}
          </div>
          {editTitle && <span className="text-xs text-muted-foreground">{titleDraft.length}/{TITLE_MAX}</span>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={question?.allowSameNamePlaylist ?? false}
            onChange={async (e) => {
              if (!id) return
              try {
                await updateQuestion(id, { allowSameNamePlaylist: e.target.checked })
                setRefreshKey((k) => k + 1)
              } catch {
                // keep checkbox in sync on error
                setRefreshKey((k) => k + 1)
              }
            }}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm text-gray-700">Allow Same Name Playlist</span>
        </label>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">Description</Label>
          {editDescription ? (
            <div className="relative">
              <textarea
                maxLength={DESCRIPTION_MAX}
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="Add Description"
              />
              <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {descriptionDraft.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {question?.description || "—"}
              <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={startEditDescription}>
                Edit
              </Button>
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Added on {formatDate(question?.creationDate)} by {question?.creator?.name ?? question?.creator?.userName ?? "—"}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={displayChecked} disabled={displayToggling} onChange={(e) => handleDisplayChange(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <span className="text-sm text-gray-700">Display</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allowSuggestionChecked} disabled={suggestionToggling} onChange={(e) => handleAllowSuggestionChange(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <span className="text-sm text-gray-700">Allow Suggestion</span>
          </label>
        </div>
      </div>

      {/* Playlist Intro / Outro — label + duration, HTML player, Edit/Delete, Download, Add Intro/Outro */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Playlist Intro and Outro</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Playlist Intro</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              {(attrs?.playlistIntro?.contentURI || introPreviewUrl) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Playlist Intro</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatDurationHMS(attrs?.playlistIntro?.duration ?? introAudioRef.current?.duration ?? 0)}
                    </span>
                  </div>
                  <audio
                    ref={introAudioRef}
                    src={introPreviewUrl ?? attrs?.playlistIntro?.contentURI ?? ""}
                    controls
                    preload="metadata"
                    className="w-full h-9"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIntroOutroEdit(true)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={clearIntro} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                    <a href={introPreviewUrl ?? attrs?.playlistIntro?.contentURI ?? "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                      <Download className="size-3.5" /> Download
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No intro</p>
              )}
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-1.5">
                {introUploading ? "Uploading…" : "Add Intro"}
              </span>
              <input type="file" accept="audio/mpeg,audio/mp3,.mp3" className="sr-only" onChange={handleIntroFile} disabled={introUploading} />
            </label>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Playlist Outro</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              {(attrs?.playlistOutro?.contentURI || outroPreviewUrl) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Playlist Outro</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatDurationHMS(attrs?.playlistOutro?.duration ?? outroAudioRef.current?.duration ?? 0)}
                    </span>
                  </div>
                  <audio
                    ref={outroAudioRef}
                    src={outroPreviewUrl ?? attrs?.playlistOutro?.contentURI ?? ""}
                    controls
                    preload="metadata"
                    className="w-full h-9"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIntroOutroEdit(true)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={clearOutro} aria-label="Delete">
                      <Trash2 className="size-4" />
                    </Button>
                    <a href={outroPreviewUrl ?? attrs?.playlistOutro?.contentURI ?? "#"} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                      <Download className="size-3.5" /> Download
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No outro</p>
              )}
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-1.5">
                {outroUploading ? "Uploading…" : "Add Outro"}
              </span>
              <input type="file" accept="audio/mpeg,audio/mp3,.mp3" className="sr-only" onChange={handleOutroFile} disabled={outroUploading} />
            </label>
          </div>
        </div>
        {introOutroEdit && (introPreviewUrl || outroPreviewUrl || attrs?.playlistIntro?.contentURI || attrs?.playlistOutro?.contentURI) && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIntroOutroEdit(false); setIntroPreviewUrl(null); setOutroPreviewUrl(null) }}>
              Cancel
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveIntroOutro} disabled={introOutroSaveSubmitting}>
              {introOutroSaveSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Share Image — reference: Upload Image, Browse File, preview card, Color, Image Type */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm font-medium text-gray-900">Upload Image</Label>
          <label className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <span>Browse File</span>
            <input type="file" accept="image/*" className="sr-only" readOnly />
          </label>
        </div>
        <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden max-w-md aspect-[4/3] flex flex-col p-4 relative">
          <div className="absolute top-3 right-3 text-xs font-semibold text-gray-500">HARK</div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-6">HARKLIST</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{question?.title ?? "Playlist title"}</p>
          <div className="mt-auto flex justify-end">
            <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center">
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white ml-1" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Color</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-8 w-10 rounded border border-gray-300 shrink-0" style={{ backgroundColor: toHex(question?.foregroundColor) }} />
              <span className="text-sm text-gray-700">Foreground Color</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-8 w-10 rounded border border-gray-300 shrink-0" style={{ backgroundColor: toHex(question?.backgroundColor) }} />
              <span className="text-sm text-gray-700">Background Color</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-8 w-10 rounded border border-gray-300 shrink-0" style={{ backgroundColor: toHex(question?.clipAlternativeColor) }} />
              <span className="text-sm text-gray-700">Clip Alternative Color</span>
            </div>
            <Button variant="outline" size="sm" onClick={openColorModal}>
              Add Color
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Image Type</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="imageType"
                checked={!question?.displayAlternateImage}
                onChange={() => handleImageTypeChange("primary")}
                disabled={imageTypeSubmitting}
                className="h-4 w-4"
              />
              <span className="text-sm">Edit My Primary</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="imageType"
                checked={!!question?.displayAlternateImage}
                onChange={() => handleImageTypeChange("alternative")}
                disabled={imageTypeSubmitting}
                className="h-4 w-4"
              />
              <span className="text-sm">Manual</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tags, Genres, Themes, Host — reference: Search or Add… + Save Tags/Genres/Themes */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Tags, Genres, Themes, Host</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm text-gray-700">Tags</Label>
              <CreatableMultiSelect
                options={tagOptions}
                value={getSelectedOptions(tagOptions, tagIds)}
                onChangeIds={setTagIds}
                placeholder="Search or Add Tags"
                disabled={tagsSaving}
              />
            </div>
            <Button size="sm" onClick={handleSaveTags} disabled={tagsSaving}>
              {tagsSaving ? "Saving…" : "Save Tags"}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm text-gray-700">Genres</Label>
              <CreatableMultiSelect
                options={genreOptions}
                value={getSelectedOptions(genreOptions, genreIds)}
                onChangeIds={setGenreIds}
                placeholder="Search or Add Genres"
                disabled={genresSaving}
              />
            </div>
            <Button size="sm" onClick={handleSaveGenres} disabled={genresSaving}>
              {genresSaving ? "Saving…" : "Save Genres"}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm text-gray-700">Themes</Label>
              <CreatableMultiSelect
                options={toneOptions}
                value={getSelectedOptions(toneOptions, toneIds)}
                onChangeIds={setToneIds}
                placeholder="Search or Add Themes"
                disabled={tonesSaving}
              />
            </div>
            <Button size="sm" onClick={handleSaveTones} disabled={tonesSaving}>
              {tonesSaving ? "Saving…" : "Save Themes"}
            </Button>
          </div>
          <div className="max-w-md">
            <Label className="text-sm text-gray-700">Host</Label>
            <Input placeholder="Host" className="mt-1" readOnly />
          </div>
        </div>
      </div>

      {/* Color modal */}
      {colorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="color-modal-title"
          onClick={() => setColorModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="color-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
              Edit Colors
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Color</Label>
                <Select
                  value={colorDraft.color ?? ""}
                  onValueChange={(v) => setColorDraft((d) => ({ ...d, color: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorsList.map((c) => (
                      <SelectItem key={c._id ?? c.colorCode ?? c.name} value={String(c.colorCode ?? c._id ?? "")}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded border"
                            style={{ backgroundColor: toHex(c.colorCode as string) }}
                          />
                          {c.name ?? c.colorCode ?? ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Foreground</Label>
                <Select
                  value={colorDraft.foregroundColor ?? ""}
                  onValueChange={(v) => setColorDraft((d) => ({ ...d, foregroundColor: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorsList.map((c) => (
                      <SelectItem key={`fg-${c._id}`} value={String(c.colorCode ?? c._id ?? "")}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: toHex(c.colorCode as string) }} />
                          {c.name ?? c.colorCode ?? ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Background</Label>
                <Select
                  value={colorDraft.backgroundColor ?? ""}
                  onValueChange={(v) => setColorDraft((d) => ({ ...d, backgroundColor: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorsList.map((c) => (
                      <SelectItem key={`bg-${c._id}`} value={String(c.colorCode ?? c._id ?? "")}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: toHex(c.colorCode as string) }} />
                          {c.name ?? c.colorCode ?? ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Clip Main</Label>
                <Select
                  value={colorDraft.clipMainColor ?? ""}
                  onValueChange={(v) => setColorDraft((d) => ({ ...d, clipMainColor: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorsList.map((c) => (
                      <SelectItem key={`cm-${c._id}`} value={String(c.colorCode ?? c._id ?? "")}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: toHex(c.colorCode as string) }} />
                          {c.name ?? c.colorCode ?? ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-28 text-xs">Clip Alt</Label>
                <Select
                  value={colorDraft.clipAlternativeColor ?? ""}
                  onValueChange={(v) => setColorDraft((d) => ({ ...d, clipAlternativeColor: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorsList.map((c) => (
                      <SelectItem key={`ca-${c._id}`} value={String(c.colorCode ?? c._id ?? "")}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded border" style={{ backgroundColor: toHex(c.colorCode as string) }} />
                          {c.name ?? c.colorCode ?? ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setColorModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={applyColorDraftAndSave} disabled={colorSaveSubmitting}>
                {colorSaveSubmitting ? "Saving…" : "OK"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Segments / Clips — reference: table with Duration, Title, Show Name, Publish Date */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Segments / Clips</h2>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link to={`/dashboard/add-clip/${id}`}>Add Clip</Link>
          </Button>
        </div>
        <div className="relative min-h-[120px] overflow-x-auto">
          {answersLoading && <LoadingState overlay message="Loading clips…" />}
          {!answersLoading && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Show Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Publish Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {totalAnswers === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No clips in this playlist yet.
                    </td>
                  </tr>
                )}
                {answers.slice(0, 10).map((clip) => (
                  <tr key={clip._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">—</td>
                    <td className="px-4 py-3">
                      <Link
                        to={clip.type === "voicedclip" ? `/dashboard/voicedclip/detail/${clip._id}` : `/dashboard/clip/detail/${clip._id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {clip.title ?? "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">—</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(clip.creationDate)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!answersLoading && totalAnswers > 10 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <Link to={`/dashboard/clips/playlist/${id}`} className="text-sm text-primary hover:underline">
                View all {totalAnswers} clips →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sponsors, Partner — reference placeholders */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6 flex flex-wrap gap-6">
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Sponsors</h2>
          <Button variant="outline" size="sm">Add Sponsor</Button>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">Partner</h2>
          <Button variant="outline" size="sm">Add Partner</Button>
        </div>
      </div>

      {/* Website Meta Description — reference: Title, Description, Keywords, Save Meta */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Website Meta Description</h2>
        <form onSubmit={handleMetaSubmit} className="space-y-4 max-w-xl">
          <div>
            <Label htmlFor="meta-title" className="text-sm text-gray-700">Title</Label>
            <div className="relative mt-1">
              <input
                id="meta-title"
                type="text"
                maxLength={META_TITLE_MAX}
                placeholder="Title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {metaTitle.length}/{META_TITLE_MAX}
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="meta-desc" className="text-sm text-gray-700">Description</Label>
            <div className="relative mt-1">
              <textarea
                id="meta-desc"
                maxLength={META_DESC_MAX}
                placeholder="Description"
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
              <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {metaDesc.length}/{META_DESC_MAX}
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="meta-keywords" className="text-sm text-gray-700">Keywords</Label>
            <textarea id="meta-keywords" placeholder="Keywords" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm mt-1" readOnly />
          </div>
          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!metaChangesMade || metaSubmitting}>
            {metaSubmitting ? "Saving…" : "Save Meta"}
          </Button>
        </form>
      </div>

      {/* Delete confirmation modal — spec §18 */}
      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-playlist-title"
          onClick={closeDeleteConfirm}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-playlist-title" className="text-lg font-semibold text-gray-900">
              Confirmation
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete this Harklist?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteConfirm}
                disabled={deleteSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
