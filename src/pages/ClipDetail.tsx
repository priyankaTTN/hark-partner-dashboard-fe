import { useParams, useNavigate, Link } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import {
  getAnswerDetailUrl,
  getTagsUrl,
  getGenresUrl,
  getTonesUrl,
  getQuestionAnswersUrl,
  deleteAnswer,
  updateAnswer,
  setAnswerTags,
  setAnswerGenres,
  setAnswerTones,
  saveAnswerMetaTags,
  updateAnswerClipLink,
  uploadIntroOutroOrImage,
  lockClipAudioUrl,
  type AnswerDetailResponse,
  type EditAnswerPayload,
  type TagGenreToneItem,
  type TagsListResponse,
  type GenresListResponse,
  type TonesListResponse,
  type QuestionAnswersResponse,
  type AnswerClip,
} from "@/lib/api"
import { IMAGE_PATH, WEB_URL } from "@/config/constant"
import useFetch from "@/customHook/useFetch"
import { formatDate, clipTimeToSeconds, secondsToHMS } from "@/lib/utils"
import { AudioTrimmer } from "@/components/AudioTrimmer"
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

/** Get tag/genre/tone ids from answer (objects or strings) */
function getIds(list: Array<{ _id: string; name?: string } | string> | undefined): string[] {
  if (!Array.isArray(list)) return []
  return list.map((t) => (typeof t === "string" ? t : t._id)).filter(Boolean)
}

/** Clean time dropdowns: Hours, Minutes, Seconds, Tenths using shadcn Select. */
function TimeDropdowns({
  valueSec,
  onChangeSec,
}: {
  valueSec: number
  onChangeSec: (sec: number) => void
}) {
  const { h, m, s, tenth } = secondsToHMS(valueSec)
  const apply = (newH: number, newM: number, newS: number, newTenth: number) => {
    const hhmmss = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}:${String(newS).padStart(2, "0")}`
    onChangeSec(clipTimeToSeconds(hhmmss, newTenth))
  }
  const triggerClass = "h-9 w-[4rem] font-mono"
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select value={String(h)} onValueChange={(v) => apply(Number(v), m, s, tenth)}>
        <SelectTrigger className={triggerClass} aria-label="Hours">
          <SelectValue>{String(h).padStart(2, "0")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 24 }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {String(i).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-mono text-sm">:</span>
      <Select value={String(m)} onValueChange={(v) => apply(h, Number(v), s, tenth)}>
        <SelectTrigger className={triggerClass} aria-label="Minutes">
          <SelectValue>{String(m).padStart(2, "0")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 60 }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {String(i).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-mono text-sm">:</span>
      <Select value={String(s)} onValueChange={(v) => apply(h, m, Number(v), tenth)}>
        <SelectTrigger className={triggerClass} aria-label="Seconds">
          <SelectValue>{String(s).padStart(2, "0")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 60 }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {String(i).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">.</span>
      <Select value={String(tenth)} onValueChange={(v) => apply(h, m, s, Number(v))}>
        <SelectTrigger className="h-9 w-[3rem] font-mono" aria-label="Tenths">
          <SelectValue>{tenth}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const TITLE_MAX = 200
const META_TITLE_MAX = 70
const META_DESC_MAX = 160

export function ClipDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [editTitle, setEditTitle] = useState(false)
  const [editDescription, setEditDescription] = useState(false)
  /** When true, full clip edit mode: trimmer, time form, and Save/Cancel are shown. */
  const [isEditMode, setIsEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [subTextDraft, setSubTextDraft] = useState("")
  const [saveSubmitting, setSaveSubmitting] = useState(false)
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDesc, setMetaDesc] = useState("")
  const [metaSubmitting, setMetaSubmitting] = useState(false)
  const [clipLinkTitle, setClipLinkTitle] = useState("")
  const [clipLinkUrl, setClipLinkUrl] = useState("")
  const [clipLinkSubmitting, setClipLinkSubmitting] = useState(false)
  /** Clip interval in seconds (with tenths). Spec: HH:mm:ss + tenths → stored as float for API/trimmer. */
  const [startTimeSec, setStartTimeSec] = useState<number>(0)
  const [endTimeSec, setEndTimeSec] = useState<number>(0)
  const [isAudioLocked, setIsAudioLocked] = useState(false)
  const [lockSubmitting, setLockSubmitting] = useState(false)
  const [isNewStartEndTime, setIsNewStartEndTime] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [aiIntroDraft, setAiIntroDraft] = useState("")
  const [shareImageUploading, setShareImageUploading] = useState(false)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [genreIds, setGenreIds] = useState<string[]>([])
  const [toneIds, setToneIds] = useState<string[]>([])
  const [tagsSaving, setTagsSaving] = useState(false)
  const [genresSaving, setGenresSaving] = useState(false)
  const [tonesSaving, setTonesSaving] = useState(false)

  const detailUrl = getAnswerDetailUrl(id, refreshKey)
  const { data: detailData, loading: detailLoading, error: detailError } = useFetch(detailUrl, {
    credentials: "include",
  })
  const { data: tagsData } = useFetch(getTagsUrl(), { credentials: "include" })
  const { data: genresData } = useFetch(getGenresUrl(), { credentials: "include" })
  const { data: tonesData } = useFetch(getTonesUrl(), { credentials: "include" })

  const answer = (detailData as AnswerDetailResponse | null) ?? null
  const questionId = answer?.question?._id

  const relatedClipsUrl = useMemo(() => {
    if (!questionId) return ""
    return getQuestionAnswersUrl(questionId, refreshKey)
  }, [questionId, refreshKey])
  const { data: relatedData } = useFetch(relatedClipsUrl, { credentials: "include" })

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

  const relatedResponse = relatedData as QuestionAnswersResponse | { data?: QuestionAnswersResponse } | null
  const raw = (relatedResponse && "data" in relatedResponse ? relatedResponse.data : relatedResponse) as QuestionAnswersResponse | undefined
  const relatedClips: AnswerClip[] = raw?.answers ?? []

  const tagOptions = useMemo(() => mapToCreatableOptions(tagsList), [tagsList])
  const genreOptions = useMemo(() => mapToCreatableOptions(genresList), [genresList])
  const toneOptions = useMemo(() => mapToCreatableOptions(tonesList), [tonesList])

  useEffect(() => {
    if (answer?.metaTag) {
      setMetaTitle(answer.metaTag.title ?? "")
      setMetaDesc(answer.metaTag.description ?? "")
    }
  }, [answer?._id, answer?.metaTag?.title, answer?.metaTag?.description])

  useEffect(() => {
    if (answer?.clipLink) {
      setClipLinkTitle(answer.clipLink.title ?? "")
      setClipLinkUrl(answer.clipLink.url ?? "")
    }
  }, [answer?._id, answer?.clipLink?.title, answer?.clipLink?.url])

  useEffect(() => {
    if (answer?.customAttributes?.podcast) {
      const p = answer.customAttributes.podcast
      const start = Number(p.startTime) ?? 0
      const end = Number(p.endTime) ?? 0
      setStartTimeSec(Math.min(start, end))
      setEndTimeSec(Math.max(start, end))
    }
  }, [answer?._id, answer?.customAttributes?.podcast?.startTime, answer?.customAttributes?.podcast?.endTime])

  useEffect(() => {
    if (answer && typeof answer.isAudioLocked === "boolean") {
      setIsAudioLocked(answer.isAudioLocked)
    }
  }, [answer?._id, answer?.isAudioLocked])

  useEffect(() => {
    if (answer) {
      setTitleDraft(answer.title ?? "")
      setDescriptionDraft(answer.description ?? "")
      setSubTextDraft(answer.subText ?? "")
      setAiIntroDraft(answer.customAttributes?.aiIntro ?? "")
    }
  }, [answer?._id, answer?.title, answer?.description, answer?.subText, answer?.customAttributes?.aiIntro])

  useEffect(() => {
    if (answer) {
      setTagIds(getIds(answer.tags))
      setGenreIds(getIds(answer.genres))
      setToneIds(getIds(answer.tones))
    }
  }, [answer?._id, answer?.tags, answer?.genres, answer?.tones])

  const metaChangesMade =
    metaTitle !== (answer?.metaTag?.title ?? "") || metaDesc !== (answer?.metaTag?.description ?? "")
  const clipLinkChangesMade =
    clipLinkTitle !== (answer?.clipLink?.title ?? "") || clipLinkUrl !== (answer?.clipLink?.url ?? "")

  const validTagIds = useMemo(
    () => tagIds.filter((id) => tagsList.some((t) => t._id === id)),
    [tagIds, tagsList]
  )
  const validGenreIds = useMemo(
    () => genreIds.filter((id) => genresList.some((g) => g._id === id)),
    [genreIds, genresList]
  )
  const validToneIds = useMemo(
    () => toneIds.filter((id) => tonesList.some((t) => t._id === id)),
    [toneIds, tonesList]
  )

  const isEmpty = !detailLoading && !detailError && (!answer || !answer._id)
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
      await deleteAnswer(id)
      closeDeleteConfirm()
      navigate("/dashboard/clips", { replace: true })
    } catch {
      closeDeleteConfirm()
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const startEditTitle = () => {
    setTitleDraft(answer?.title ?? "")
    setEditTitle(true)
  }
  const startEditDescription = () => {
    setDescriptionDraft(answer?.description ?? "")
    setEditDescription(true)
  }
  /** Enter full edit mode (trimmer, time form, title/description editable). */
  const startEditClip = () => {
    setTitleDraft(answer?.title ?? "")
    setDescriptionDraft(answer?.description ?? "")
    setEditTitle(true)
    setEditDescription(true)
    setIsEditMode(true)
  }
  const cancelEdit = () => {
    setEditTitle(false)
    setEditDescription(false)
    setIsEditMode(false)
    setTimeError(null)
    setRefreshKey((k) => k + 1)
  }

  /** Clip duration in seconds (from podcast or 0). */
  const clipDurationSec = answer?.customAttributes?.podcast?.duration ?? 0

  /** Spec: end > 0, end >= start, end <= duration. */
  const validateTimeInterval = (): string | null => {
    if (endTimeSec <= 0) return "End time must be greater than 0."
    if (endTimeSec < startTimeSec) return "Start time cannot be greater than end time."
    if (clipDurationSec > 0 && endTimeSec > clipDurationSec) return "End time cannot be greater than clip duration."
    return null
  }

  /** Save clip — POST /api/v1/answers/:id (ANSWER_DETAIL save) */
  const handleSave = async () => {
    if (!id) return
    const err = validateTimeInterval()
    if (err) {
      setTimeError(err)
      return
    }
    setTimeError(null)
    const payload: EditAnswerPayload = {
      title: editTitle ? titleDraft.trim() : undefined,
      description: editDescription ? descriptionDraft.trim() : undefined,
      subText: subTextDraft.trim() || undefined,
      aiIntro: aiIntroDraft.trim() || undefined,
      podcast: {
        startTime: startTimeSec >= 0 ? startTimeSec : undefined,
        endTime: endTimeSec > 0 ? endTimeSec : undefined,
      },
      isNewStartEndTime: isNewStartEndTime || undefined,
    }
    if (!editTitle && !editDescription) {
      payload.title = answer?.title
      payload.description = answer?.description
      payload.subText = subTextDraft.trim() || undefined
      payload.aiIntro = aiIntroDraft.trim() || undefined
    }
    setSaveSubmitting(true)
    try {
      await updateAnswer(id, payload)
    setEditTitle(false)
    setEditDescription(false)
    setIsEditMode(false)
    setIsNewStartEndTime(false)
    setRefreshKey((k) => k + 1)
    } finally {
      setSaveSubmitting(false)
    }
  }

  const hasEditChanges =
    editTitle ||
    editDescription ||
    titleDraft !== (answer?.title ?? "") ||
    descriptionDraft !== (answer?.description ?? "") ||
    subTextDraft !== (answer?.subText ?? "") ||
    aiIntroDraft !== (answer?.customAttributes?.aiIntro ?? "") ||
    startTimeSec !== (answer?.customAttributes?.podcast?.startTime ?? 0) ||
    endTimeSec !== (answer?.customAttributes?.podcast?.endTime ?? 0)

  /** Trimmer audio URL: prefer S3, then episode/clip URL (spec). */
  const trimmerAudioUrl =
    answer?.customAttributes?.podcast?.s3audioUrl ||
    answer?.customAttributes?.podcast?.audioUrl ||
    (answer?.customAttributes?.podcast as { clipAudioUrl?: string } | undefined)?.clipAudioUrl

  const episodeData = answer?.customAttributes?.podcast
  const peaksUrl =
    episodeData?.podcastSlug && episodeData?.episodeSlug
      ? `${IMAGE_PATH}/episode-waveforms/${episodeData.podcastSlug}/${episodeData.episodeSlug}/10pps.json`
      : null

  const isClipEditMode = isEditMode || editTitle || editDescription
  const showTrimmerAndTimeForm = isClipEditMode && !isAudioLocked
  const showViewPlayer = !showTrimmerAndTimeForm || isAudioLocked

  const handleTrimChange = (start: number, end: number) => {
    const s = Math.min(start, end)
    const e = Math.max(start, end)
    setStartTimeSec(s)
    setEndTimeSec(e)
    setIsNewStartEndTime(true)
    setTimeError(null)
  }

  const handleLockAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return
    const locked = e.target.checked
    setLockSubmitting(true)
    try {
      await lockClipAudioUrl({ clipId: id, isAudioLocked: locked })
      setIsAudioLocked(locked)
      setRefreshKey((k) => k + 1)
    } finally {
      setLockSubmitting(false)
    }
  }

  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !metaChangesMade) return
    setMetaSubmitting(true)
    try {
      await saveAnswerMetaTags({
        id,
        title: metaTitle.trim() || undefined,
        description: metaDesc.trim() || undefined,
      })
      setRefreshKey((k) => k + 1)
    } finally {
      setMetaSubmitting(false)
    }
  }

  const handleClipLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !clipLinkChangesMade) return
    setClipLinkSubmitting(true)
    try {
      await updateAnswerClipLink({
        id,
        title: clipLinkTitle.trim() || undefined,
        url: clipLinkUrl.trim() || undefined,
      })
      setRefreshKey((k) => k + 1)
    } finally {
      setClipLinkSubmitting(false)
    }
  }

  const handleSaveTags = async () => {
    if (!id) return
    setTagsSaving(true)
    try {
      await setAnswerTags(id, validTagIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setTagsSaving(false)
    }
  }
  const handleSaveGenres = async () => {
    if (!id) return
    setGenresSaving(true)
    try {
      await setAnswerGenres(id, validGenreIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setGenresSaving(false)
    }
  }
  const handleSaveTones = async () => {
    if (!id) return
    setTonesSaving(true)
    try {
      await setAnswerTones(id, validToneIds)
      setRefreshKey((k) => k + 1)
    } finally {
      setTonesSaving(false)
    }
  }

  const handleShareImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setShareImageUploading(true)
    try {
      const { location } = await uploadIntroOutroOrImage(file)
      await updateAnswer(id, {
        isCustomImagePath: true,
        customImagePath: location,
      })
      setRefreshKey((k) => k + 1)
    } finally {
      setShareImageUploading(false)
      e.target.value = ""
    }
  }

  const shareImageUrl = useMemo(() => {
    if (!id) return ""
    if (answer?.isCustomImagePath && answer?.customImagePath) return answer.customImagePath
    return `${IMAGE_PATH}/img/answers/card/${id}.png`
  }, [id, answer?.isCustomImagePath, answer?.customImagePath])

  if (loading) {
    return (
      <div className="flex flex-col pb-6">
        <LoadingState message="Loading clip…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col pb-6">
        <ErrorState message={String(error)} />
        <Link to="/dashboard/clips" className="mt-4 text-sm text-primary hover:underline">
          ← Back to Clips
        </Link>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col pb-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-8 text-center text-gray-500">
          Clip not found
        </div>
        <Link to="/dashboard/clips" className="mt-4 text-sm text-primary hover:underline">
          ← Back to Clips
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/dashboard/clips" className="text-sm text-primary hover:underline">
          ← Back to Clips
        </Link>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button variant="outline" size="sm" onClick={startEditClip}>
              Edit clip
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
          {answer?.href && (
            <a
              href={`${WEB_URL}/${answer.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on Web
            </a>
          )}
          <Button variant="destructive" size="sm" onClick={openDeleteConfirm}>
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Title</Label>
          {editTitle ? (
            <div className="flex flex-col gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                className="max-w-xl"
              />
              <span className="text-xs text-gray-500">
                {titleDraft.length}/{TITLE_MAX}
              </span>
            </div>
          ) : (
            <p className="text-lg font-medium text-gray-900">
              {answer?.title ?? "—"}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={startEditTitle}
              >
                Edit
              </Button>
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Description</Label>
          {editDescription ? (
            <textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              className="flex min-h-[80px] w-full max-w-xl rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              rows={4}
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {answer?.description ?? "—"}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={startEditDescription}
              >
                Edit
              </Button>
            </p>
          )}
        </div>

        {/* Subtext */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Subtext</Label>
          <Input
            value={subTextDraft}
            onChange={(e) => setSubTextDraft(e.target.value)}
            className="max-w-xl"
          />
        </div>

        {/* Lock clip audio — when locked, trimmer and time form are hidden (spec) */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lock-clip-audio"
            checked={isAudioLocked}
            onChange={handleLockAudioChange}
            disabled={lockSubmitting}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="lock-clip-audio" className="text-sm font-medium cursor-pointer">
            Lock clip audio {lockSubmitting ? "(saving…)" : ""}
          </Label>
        </div>

        {/* Waveform: view mode (playback only) or edit mode (trimmer + time form) per spec */}
        {trimmerAudioUrl && (
          <div className="space-y-4">
            {showViewPlayer && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Clip playback</Label>
                <AudioTrimmer
                  audioUrl={trimmerAudioUrl}
                  duration={clipDurationSec || undefined}
                  peaksUrl={peaksUrl ?? undefined}
                  activeClip={{ startTime: startTimeSec, endTime: endTimeSec, title: answer?.title, description: answer?.description }}
                  viewOnly
                  hidePlayControl={false}
                  className="rounded-md border border-gray-200 p-2"
                />
              </div>
            )}
            {showTrimmerAndTimeForm && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500">Trim clip (drag region to set start/end)</Label>
                  <AudioTrimmer
                    audioUrl={trimmerAudioUrl}
                    duration={clipDurationSec || undefined}
                    peaksUrl={peaksUrl ?? undefined}
                    activeClip={{ startTime: startTimeSec, endTime: endTimeSec, title: answer?.title, description: answer?.description }}
                    onTrimChange={handleTrimChange}
                    hideEditingControls={false}
                    showCreateClipButton={false}
                    className="rounded-md border border-gray-200 p-2"
                  />
                </div>
                {/* Time dropdowns: H / M / S / tenths (like reference time picker) */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Start and end time</h3>
                  {timeError && (
                    <p className="text-sm text-destructive" role="alert">
                      {timeError}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-500">Start time</Label>
                      <TimeDropdowns
                        valueSec={startTimeSec}
                        onChangeSec={(sec) => {
                          setStartTimeSec(Math.min(sec, endTimeSec))
                          setIsNewStartEndTime(true)
                          setTimeError(null)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-500">End time</Label>
                      <TimeDropdowns
                        valueSec={endTimeSec}
                        onChangeSec={(sec) => {
                          setEndTimeSec(Math.max(sec, startTimeSec))
                          setIsNewStartEndTime(true)
                          setTimeError(null)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* When no trimmer URL but in edit mode: time dropdowns only (spec) */}
        {showTrimmerAndTimeForm && !trimmerAudioUrl && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Start and end time</h3>
            {timeError && (
              <p className="text-sm text-destructive" role="alert">
                {timeError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Start time</Label>
                <TimeDropdowns
                  valueSec={startTimeSec}
                  onChangeSec={(sec) => {
                    setStartTimeSec(Math.min(sec, endTimeSec))
                    setIsNewStartEndTime(true)
                    setTimeError(null)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">End time</Label>
                <TimeDropdowns
                  valueSec={endTimeSec}
                  onChangeSec={(sec) => {
                    setEndTimeSec(Math.max(sec, startTimeSec))
                    setIsNewStartEndTime(true)
                    setTimeError(null)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* AI Intro */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">AI Intro</Label>
          <textarea
            value={aiIntroDraft}
            onChange={(e) => setAiIntroDraft(e.target.value)}
            className="flex min-h-[60px] w-full max-w-xl rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        {/* Share image */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-500">Share image</Label>
          <div className="flex items-start gap-4">
            <img
              src={shareImageUrl}
              alt="Share card"
              className="h-24 w-auto rounded border object-cover"
            />
            <div>
              <label className="cursor-pointer">
                <span className="text-sm text-primary hover:underline">
                  {shareImageUploading ? "Uploading…" : "Upload image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={shareImageUploading}
                  onChange={handleShareImageUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Tags / Genres / Tones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">Tags</Label>
            <CreatableMultiSelect
              options={tagOptions}
              value={getSelectedOptions(tagOptions, tagIds)}
              onChangeIds={setTagIds}
              placeholder="Select or type to create…"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveTags}
              disabled={tagsSaving}
            >
              {tagsSaving ? "Saving…" : "Save tags"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">Genres</Label>
            <CreatableMultiSelect
              options={genreOptions}
              value={getSelectedOptions(genreOptions, genreIds)}
              onChangeIds={setGenreIds}
              placeholder="Select or type to create…"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveGenres}
              disabled={genresSaving}
            >
              {genresSaving ? "Saving…" : "Save genres"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">Tones</Label>
            <CreatableMultiSelect
              options={toneOptions}
              value={getSelectedOptions(toneOptions, toneIds)}
              onChangeIds={setToneIds}
              placeholder="Select or type to create…"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveTones}
              disabled={tonesSaving}
            >
              {tonesSaving ? "Saving…" : "Save tones"}
            </Button>
          </div>
        </div>

        {/* Meta tags (SEO) */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Meta tags (SEO)</h3>
          <form onSubmit={handleMetaSubmit} className="space-y-3 max-w-xl">
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value.slice(0, META_TITLE_MAX))}
                maxLength={META_TITLE_MAX}
              />
              <span className="text-xs text-gray-500">{metaTitle.length}/{META_TITLE_MAX}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value.slice(0, META_DESC_MAX))}
                maxLength={META_DESC_MAX}
              />
              <span className="text-xs text-gray-500">{metaDesc.length}/{META_DESC_MAX}</span>
            </div>
            <Button type="submit" size="sm" disabled={!metaChangesMade || metaSubmitting}>
              {metaSubmitting ? "Saving…" : "Save meta tags"}
            </Button>
          </form>
        </div>

        {/* Clip link */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Clip link</h3>
          <form onSubmit={handleClipLinkSubmit} className="space-y-3 max-w-xl">
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={clipLinkTitle}
                onChange={(e) => setClipLinkTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL</Label>
              <Input
                type="url"
                value={clipLinkUrl}
                onChange={(e) => setClipLinkUrl(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={!clipLinkChangesMade || clipLinkSubmitting}>
              {clipLinkSubmitting ? "Saving…" : "Save clip link"}
            </Button>
          </form>
        </div>

        {/* Save main edits — show when in edit mode (so user can save/cancel) or when there are changes */}
        {(isEditMode || hasEditChanges) && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saveSubmitting}>
              {saveSubmitting ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        )}

        {/* Meta info */}
        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          <p>ID: {answer?._id}</p>
          <p>Created: {formatDate(answer?.creationDate)}</p>
          {answer?.creator?.name && <p>Creator: {answer.creator.name}</p>}
          {answer?.question?.title && <p>Harklist: {answer.question.title}</p>}
        </div>
      </div>

      {/* Related clips (same question) */}
      {relatedClips.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Clips in same Harklist</h3>
          <ul className="space-y-1">
            {relatedClips.slice(0, 10).map((clip) => (
              <li key={clip._id}>
                <Link
                  to={`/dashboard/clips/${clip._id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {clip.title ?? clip._id}
                </Link>
              </li>
            ))}
            {relatedClips.length > 10 && (
              <li className="text-sm text-gray-500">+{relatedClips.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-clip-title"
          onClick={closeDeleteConfirm}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-clip-title" className="text-lg font-semibold text-gray-900">
              Delete clip
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete this clip? This action cannot be undone.
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
