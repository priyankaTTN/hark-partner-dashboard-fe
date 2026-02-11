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
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
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
  const raw = relatedResponse && "data" in relatedResponse ? relatedResponse.data : relatedResponse
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
      setStartTime(p.startTime ?? 0)
      setEndTime(p.endTime ?? 0)
    }
  }, [answer?._id, answer?.customAttributes?.podcast?.startTime, answer?.customAttributes?.podcast?.endTime])

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
  const cancelEdit = () => {
    setEditTitle(false)
    setEditDescription(false)
  }

  /** Save clip — POST /api/v1/answers/:id (ANSWER_DETAIL save) */
  const handleSave = async () => {
    if (!id) return
    const payload: EditAnswerPayload = {
      title: editTitle ? titleDraft.trim() : undefined,
      description: editDescription ? descriptionDraft.trim() : undefined,
      subText: subTextDraft.trim() || undefined,
      aiIntro: aiIntroDraft.trim() || undefined,
      podcast: {
        startTime: startTime >= 0 ? startTime : undefined,
        endTime: endTime > 0 ? endTime : undefined,
      },
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
    startTime !== (answer?.customAttributes?.podcast?.startTime ?? 0) ||
    endTime !== (answer?.customAttributes?.podcast?.endTime ?? 0)

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

        {/* Start / End time */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">Start time (sec)</Label>
            <Input
              type="number"
              min={0}
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-500">End time (sec)</Label>
            <Input
              type="number"
              min={0}
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value) || 0)}
            />
          </div>
        </div>

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

        {/* Save main edits */}
        {hasEditChanges && (
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
