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
import { formatDate } from "@/lib/utils"
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

  /** Save question — spec §5: POST /api/v1/questions/:id with editOptions + allowSameNamePlaylist */
  const handleSave = async () => {
    if (!id) return
    setSaveSubmitting(true)
    try {
      const payload: EditQuestionPayload = {
        allowSameNamePlaylist: question?.allowSameNamePlaylist ?? false,
      }
      if (editTitle) payload.title = titleDraft.trim()
      if (editDescription) payload.description = descriptionDraft.trim()
      await updateQuestion(id, payload)
      setEditTitle(false)
      setEditDescription(false)
      setRefreshKey((k) => k + 1)
    } finally {
      setSaveSubmitting(false)
    }
  }
  const hasEditChanges = editTitle || editDescription

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
      {/* Back link */}
      <Link
        to="/dashboard/playlists"
        className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back to Playlists
      </Link>

      {/* Header section — spec §4 validation limits */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editTitle ? (
              <div className="space-y-2">
                <Label htmlFor="playlist-title">Harklist title</Label>
                <div className="relative">
                  <textarea
                    id="playlist-title"
                    maxLength={TITLE_MAX}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {titleDraft.length}/{TITLE_MAX}
                  </span>
                </div>
              </div>
            ) : (
              <h1 className="text-lg font-medium text-gray-900">
                Harklist: {question?.title ?? "—"}
              </h1>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasEditChanges ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saveSubmitting}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saveSubmitting}>
                  {saveSubmitting ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <>
                {viewOnWebUrl && (
                  <a
                    href={viewOnWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button variant="outline" size="sm">
                      View on Web
                    </Button>
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
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Added on {formatDate(question?.creationDate)} by{" "}
          {question?.creator?.name ?? question?.creator?.userName ?? "—"}
        </p>

        {/* Display & Allow Suggestion — spec §9: interactive toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={displayChecked}
              disabled={displayToggling}
              onChange={(e) => handleDisplayChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-gray-700">Display</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowSuggestionChecked}
              disabled={suggestionToggling}
              onChange={(e) => handleAllowSuggestionChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-gray-700">Allow Suggestion</span>
          </label>
          {question?.allowSameNamePlaylist && (
            <span className="text-sm text-gray-500">Allow same name Harklist</span>
          )}
        </div>

        {/* Image type — spec §21: Primary | Alternative */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 whitespace-nowrap">Image type:</span>
          <Select
            value={question?.displayAlternateImage ? "alternative" : "primary"}
            onValueChange={handleImageTypeChange}
            disabled={imageTypeSubmitting}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Image type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="alternative">Alternative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description — spec §4: 250 chars */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Description</h2>
        {editDescription ? (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                maxLength={DESCRIPTION_MAX}
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input px-3 py-2 text-sm"
              />
              <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {descriptionDraft.length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {question?.description || "—"}
            <button
              type="button"
              onClick={startEditDescription}
              className="ml-2 text-sm text-primary hover:underline"
            >
              Edit
            </button>
          </p>
        )}
      </div>

      {/* Playlist Intro / Outro — spec §6: HTML audio player + upload */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900">Playlist Intro / Outro</h2>
          {!introOutroEdit ? (
            <Button variant="outline" size="sm" onClick={() => setIntroOutroEdit(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIntroOutroEdit(false); setIntroPreviewUrl(null); setOutroPreviewUrl(null) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveIntroOutro} disabled={introOutroSaveSubmitting}>
                {introOutroSaveSubmitting ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Intro — always show player area */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Intro</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-[52px] flex flex-col justify-center">
              {(attrs?.playlistIntro?.contentURI || introPreviewUrl) ? (
                <div className="flex flex-col gap-2">
                  <audio
                    ref={introAudioRef}
                    src={introPreviewUrl ?? attrs?.playlistIntro?.contentURI ?? ""}
                    controls
                    className="w-full h-9"
                    preload="metadata"
                  />
                  {introOutroEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearIntro} className="self-start" aria-label="Clear intro">
                      Clear intro
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No intro</p>
              )}
            </div>
            {introOutroEdit && (
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3"
                  onChange={handleIntroFile}
                  disabled={introUploading}
                  className="text-sm"
                />
                {introUploading && <span className="text-xs text-gray-500">Uploading…</span>}
              </div>
            )}
          </div>
          {/* Outro — always show player area */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Outro</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 min-h-[52px] flex flex-col justify-center">
              {(attrs?.playlistOutro?.contentURI || outroPreviewUrl) ? (
                <div className="flex flex-col gap-2">
                  <audio
                    ref={outroAudioRef}
                    src={outroPreviewUrl ?? attrs?.playlistOutro?.contentURI ?? ""}
                    controls
                    className="w-full h-9"
                    preload="metadata"
                  />
                  {introOutroEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearOutro} className="self-start" aria-label="Clear outro">
                      Clear outro
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No outro</p>
              )}
            </div>
            {introOutroEdit && (
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3"
                  onChange={handleOutroFile}
                  disabled={outroUploading}
                  className="text-sm"
                />
                {outroUploading && <span className="text-xs text-gray-500">Uploading…</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags / Genres / Tones — spec §7: CreatableSelect (react-select/creatable) */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Tags / Genres / Tones</h2>
        <p className="text-xs text-gray-500 mb-3">
          Select from the list or type to create a new option. Save to persist.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <CreatableMultiSelect
              label="Tags"
              options={tagOptions}
              value={getSelectedOptions(tagOptions, tagIds)}
              onChangeIds={setTagIds}
              placeholder="Select or create tags..."
              disabled={tagsSaving}
            />
            <Button size="sm" onClick={handleSaveTags} disabled={tagsSaving}>
              {tagsSaving ? "Saving…" : "Save Tags"}
            </Button>
          </div>
          <div className="space-y-2">
            <CreatableMultiSelect
              label="Genres"
              options={genreOptions}
              value={getSelectedOptions(genreOptions, genreIds)}
              onChangeIds={setGenreIds}
              placeholder="Select or create genres..."
              disabled={genresSaving}
            />
            <Button size="sm" onClick={handleSaveGenres} disabled={genresSaving}>
              {genresSaving ? "Saving…" : "Save Genres"}
            </Button>
          </div>
          <div className="space-y-2">
            <CreatableMultiSelect
              label="Tones"
              options={toneOptions}
              value={getSelectedOptions(toneOptions, toneIds)}
              onChangeIds={setToneIds}
              placeholder="Select or create tones..."
              disabled={tonesSaving}
            />
            <Button size="sm" onClick={handleSaveTones} disabled={tonesSaving}>
              {tonesSaving ? "Saving…" : "Save Tones"}
            </Button>
          </div>
        </div>
      </div>

      {/* Color section — spec: tooltip + table + Edit Color modal */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900">Colors</h2>
          <Button variant="outline" size="sm" onClick={openColorModal}>
            Edit Color
          </Button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Color, Foreground, Background, Clip Main, Clip Alternative. Use Edit Color to change.
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Color</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Foreground</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Background</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Clip Main</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Clip Alt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-6 w-10 rounded border border-gray-300"
                    style={{ backgroundColor: toHex(question?.color) }}
                    title={question?.color ?? ""}
                  />
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-6 w-10 rounded border border-gray-300"
                    style={{ backgroundColor: toHex(question?.foregroundColor) }}
                    title={question?.foregroundColor ?? ""}
                  />
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-6 w-10 rounded border border-gray-300"
                    style={{ backgroundColor: toHex(question?.backgroundColor) }}
                    title={question?.backgroundColor ?? ""}
                  />
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-6 w-10 rounded border border-gray-300"
                    style={{ backgroundColor: toHex(question?.clipMainColor) }}
                    title={question?.clipMainColor ?? ""}
                  />
                </td>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-6 w-10 rounded border border-gray-300"
                    style={{ backgroundColor: toHex(question?.clipAlternativeColor) }}
                    title={question?.clipAlternativeColor ?? ""}
                  />
                </td>
              </tr>
            </tbody>
          </table>
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

      {/* Meta Tags (SEO) — spec §16: title 70, description 160 */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Meta Tags</h2>
        <form onSubmit={handleMetaSubmit} className="space-y-3">
          <div>
            <Label htmlFor="meta-title" className="text-xs text-gray-600">
              Title
            </Label>
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
            <Label htmlFor="meta-desc" className="text-xs text-gray-600">
              Description
            </Label>
            <div className="relative mt-1">
              <textarea
                id="meta-desc"
                maxLength={META_DESC_MAX}
                placeholder="Description"
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
              <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {metaDesc.length}/{META_DESC_MAX}
              </span>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={!metaChangesMade || metaSubmitting}>
            {metaSubmitting ? "Saving…" : "Save meta tags"}
          </Button>
        </form>
      </div>

      {/* Clips (Answers) — spec §19: read-only list */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
              Clips
            </h2>
            {totalAnswers > 0 && (
              <Link
                to={`/dashboard/clips/playlist/${id}`}
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            )}
          </div>
        </div>
        <div className="relative min-h-[120px]">
          {answersLoading && (
            <LoadingState overlay message="Loading clips…" />
          )}
          {!answersLoading && totalAnswers === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No clips in this playlist yet.
            </div>
          )}
          {!answersLoading && answers.length > 0 && (
            <ul className="divide-y divide-gray-200">
              {answers.slice(0, 10).map((clip) => (
                <li key={clip._id} className="hover:bg-gray-50 transition-colors">
                  <Link
                    to={
                      clip.type === "voicedclip"
                        ? `/dashboard/voicedclip/detail/${clip._id}`
                        : `/dashboard/clip/detail/${clip._id}`
                    }
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    {clip.imageUrl && (
                      <img
                        src={clip.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded object-cover shrink-0"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                      {clip.title ?? "Untitled"}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(clip.creationDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!answersLoading && answers.length > 10 && totalAnswers > 10 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <Link
                to={`/dashboard/clips/playlist/${id}`}
                className="text-sm text-primary hover:underline"
              >
                View all {totalAnswers} clips →
              </Link>
            </div>
          )}
        </div>
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
