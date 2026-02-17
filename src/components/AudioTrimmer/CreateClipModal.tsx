/**
 * Create Clip modal: form (title, description, voice intro, tags/genres/tones, intro upload).
 * Submits payload via addNewClipInfo(payload).
 */
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreatableMultiSelect, mapToCreatableOptions, getSelectedOptions } from "@/components/CreatableMultiSelect"
import type { CreatableOption } from "@/components/CreatableMultiSelect"
import { cn } from "@/lib/utils"
import { normalizeVoiceIntro } from "./utils"

export type CreateClipModalType = "vanillaVideo" | "sxmEpisode" | undefined

export type CreateClipModalProps = {
  isOpen: boolean
  onToggle: (open: boolean) => void
  startTime: number
  endTime: number
  mainAudioUrl?: string
  activeClip?: { startTime?: number; endTime?: number; title?: string; description?: string; [key: string]: unknown }
  episodeData?: Record<string, unknown>
  user?: { uid: string; name: string }
  type?: CreateClipModalType
  addNewClipInfo: (payload: Record<string, unknown>) => void
  searchHarkList?: (params: { playlistqs: string; type: string }, callback: (data: { results?: unknown[]; dictionary?: unknown }) => void) => void
  fetchAllTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  fetchGenreTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  fetchToneTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  onResumeAudio?: () => void
  /** Upload loading indicator (spec: Loading / Loaded callbacks). */
  onLoading?: () => void
  onLoaded?: () => void
  /** Callback after intro upload with S3 data (spec: S3UploadData). */
  onS3UploadData?: (data: { location?: string }) => void
  /** Upload intro API (e.g. POST uploadIntro). */
  uploadIntro?: (file: File) => Promise<{ location: string }>
  className?: string
}

export function CreateClipModal({
  isOpen,
  onToggle,
  startTime,
  endTime,
  mainAudioUrl,
  activeClip,
  episodeData,
  user,
  type,
  addNewClipInfo,
  // searchHarkList,
  fetchAllTags,
  fetchGenreTags,
  fetchToneTags,
  onResumeAudio,
  onLoading,
  onLoaded,
  onS3UploadData,
  uploadIntro,
  className,
}: CreateClipModalProps) {
  const [title, setTitle] = React.useState(activeClip?.title ?? "")
  const [description, setDescription] = React.useState(activeClip?.description ?? "")
  const [clipIntroText, setClipIntroText] = React.useState("")
  const [tagIds, setTagIds] = React.useState<string[]>([])
  const [genreIds, setGenreIds] = React.useState<string[]>([])
  const [toneIds, setToneIds] = React.useState<string[]>([])
  const [tagOptions, setTagOptions] = React.useState<CreatableOption[]>([])
  const [genreOptions, setGenreOptions] = React.useState<CreatableOption[]>([])
  const [toneOptions, setToneOptions] = React.useState<CreatableOption[]>([])
  const [introFile, setIntroFile] = React.useState<File | null>(null)
  const [introUploadUrl, setIntroUploadUrl] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    if (activeClip?.title) setTitle(activeClip.title)
    if (activeClip?.description) setDescription(activeClip.description ?? "")
  }, [activeClip?.title, activeClip?.description])

  React.useEffect(() => {
    if (!isOpen) return
    fetchAllTags?.({ limit: 0 }, (list) => setTagOptions(mapToCreatableOptions(list)))
    fetchGenreTags?.({ limit: 0 }, (list) => setGenreOptions(mapToCreatableOptions(list)))
    fetchToneTags?.({ limit: 0 }, (list) => setToneOptions(mapToCreatableOptions(list)))
  }, [isOpen, fetchAllTags, fetchGenreTags, fetchToneTags])

  const buildPayload = (overrideIntroUrl?: string | null): Record<string, unknown> => {
    const introUrl = overrideIntroUrl ?? introUploadUrl
    const clipKey = type === "vanillaVideo" ? "vanillaVideo" : type === "sxmEpisode" ? "sxmEpisode" : "podcast"
    const introKey = type === "vanillaVideo" ? "vanillaVideoIntro" : type === "sxmEpisode" ? "sxmEpisodeIntro" : "podcastIntro"
    const clip: Record<string, unknown> = {
      s3audioUrl: mainAudioUrl,
      startTime,
      endTime,
      ...(episodeData && { ...episodeData }),
    }
    const questionId = episodeData && typeof (episodeData as { questionId?: string }).questionId === "string" ? (episodeData as { questionId: string }).questionId : undefined
    const payload: Record<string, unknown> = {
      ...(questionId && { questionId }),
      title: title.trim() || "Untitled Clip",
      description: description.trim() || "",
      clipIntroText: normalizeVoiceIntro(clipIntroText),
      tags: tagIds,
      genres: genreIds,
      tones: toneIds,
      analytics: {
        suggestedStartTime: startTime,
        suggestedEndTime: endTime,
        is_from_ai_suggestion: false,
        creator: user?.uid,
        creatorName: user?.name,
      },
      [clipKey]: clip,
    }
    if (introUrl || introFile) {
      payload[introKey] = {
        introText: normalizeVoiceIntro(clipIntroText),
        startTime: 0,
        endTime: 0,
        duration: 0,
        contentURI: introUrl ?? "",
        userId: user?.uid,
        userName: user?.name,
        podcastName: episodeData?.name ?? "",
      }
    }
    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    try {
      let finalIntroUrl = introUploadUrl
      if (introFile && (uploadIntro || onLoading)) {
        setIsUploading(true)
        onLoading?.()
        try {
          if (uploadIntro) {
            const { location } = await uploadIntro(introFile)
            finalIntroUrl = location
            setIntroUploadUrl(location)
            onS3UploadData?.({ location })
          }
        } finally {
          onLoaded?.()
          setIsUploading(false)
        }
      }
      const payload = buildPayload(finalIntroUrl ?? undefined)
      addNewClipInfo(payload)
      onToggle(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create clip")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogContent className={cn("max-w-lg max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>Create Clip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="create-clip-title">Title</Label>
            <Input
              id="create-clip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clip title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-clip-desc">Description</Label>
            <Input
              id="create-clip-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="create-clip-intro">Voice intro text</Label>
            <Input
              id="create-clip-intro"
              value={clipIntroText}
              onChange={(e) => setClipIntroText(e.target.value)}
              placeholder="Optional voice intro"
            />
          </div>
          {fetchAllTags && (
            <div className="grid gap-2">
              <Label>Tags</Label>
              <CreatableMultiSelect
                options={tagOptions}
                value={getSelectedOptions(tagOptions, tagIds)}
                onChangeIds={setTagIds}
                placeholder="Select or create tags..."
              />
            </div>
          )}
          {fetchGenreTags && (
            <div className="grid gap-2">
              <Label>Genres</Label>
              <CreatableMultiSelect
                options={genreOptions}
                value={getSelectedOptions(genreOptions, genreIds)}
                onChangeIds={setGenreIds}
                placeholder="Select genres..."
              />
            </div>
          )}
          {fetchToneTags && (
            <div className="grid gap-2">
              <Label>Tones</Label>
              <CreatableMultiSelect
                options={toneOptions}
                value={getSelectedOptions(toneOptions, toneIds)}
                onChangeIds={setToneIds}
                placeholder="Select tones..."
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Intro audio (optional)</Label>
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setIntroFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}
          <DialogFooter>
            {onResumeAudio && (
              <Button type="button" variant="outline" onClick={onResumeAudio}>
                Resume audio
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onToggle(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Uploading…" : "Create Clip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
