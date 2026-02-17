/**
 * Transcript Detail page: transcript view, audio trimmer, and suggested clips panel.
 * Routes: /transcript-detail/:podcastSlug/:episodeSlug, /transcript-detail/keyword/:keyword, /transcript-detail/sxm/:podcastSlug/:episodeSlug.
 * Spec: TRANSCRIPT_DETAIL_COMPONENT_SPEC.md
 */
import * as React from "react"
import { useParams, useLocation, useNavigate, Link } from "react-router-dom"
import { AudioTrimmer, type AudioTrimmerRef, type ActiveClip } from "@/components/AudioTrimmer"
import { formatTime } from "@/components/AudioTrimmer/utils"
import { TranscriptView, type TranscriptSegment } from "@/components/TranscriptView"
import { SuggestedClipsPanel } from "@/components/SuggestedClipsPanel"
import type { SuggestedClipItem } from "@/components/SuggestedClipCard"
import { LoadingState } from "@/components/LoadingState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TRANSCRIPT_CATEGORY_GROUPS,
  TRANSCRIPT_MODELS,
  type CategoryGroupId,
} from "@/config/transcriptDetail"
import { IMAGE_PATH } from "@/config/constant"
import {
  createAnswer,
  fetchAllTags,
  fetchGenreTags,
  fetchToneTags,
  getEpisodeDetails,
  getSingleEpisodeTranscript,
  getSxmEpisodeDetails,
  getVanillaVideoList,
  getVoiceHarkClipSuggestions,
  requestEpisodeTranscript,
  type TranscriptSegmentResponse,
  type TranscriptRawResponse,
  type VoiceHarkClipItem,
} from "@/lib/api"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"

/** Parse API time (HH:MM:SS or HH:MM:SS.mmm) or number to seconds. */
function parseTimeToSeconds(t: string | number | undefined | null): number {
  if (t == null) return 0
  if (typeof t === "number" && Number.isFinite(t)) return t
  const s = String(t).trim()
  if (!s) return 0
  const parts = s.split(":")
  if (parts.length === 1) return parseFloat(parts[0]) || 0
  if (parts.length === 2) return (parseInt(parts[0], 10) || 0) * 60 + (parseFloat(parts[1]) || 0)
  if (parts.length === 3) {
    const last = parseFloat(parts[2]) || 0
    return (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + last
  }
  return 0
}

/** Map API segment (sentence, start_time, end_time, speaker; times as string or number) to TranscriptSegment. */
function mapTranscriptSegment(item: TranscriptSegmentResponse): TranscriptSegment {
  const start =
    item.start_time_ms != null
      ? parseTimeToSeconds(item.start_time_ms)
      : parseTimeToSeconds(item.start_time)
  const end =
    item.end_time_ms != null
      ? parseTimeToSeconds(item.end_time_ms)
      : item.end_time != null
        ? parseTimeToSeconds(item.end_time)
        : undefined
  return {
    start_time: Number.isFinite(start) ? start : 0,
    end_time: end != null && Number.isFinite(end) ? end : undefined,
    speaker: item.speaker,
    sentence: item.sentence ?? "",
    text: item.sentence ?? "",
  }
}

/** Normalize raw API response (array, object with numeric keys, or { transcripts } wrapper) to segment array. */
function normalizeTranscriptRaw(raw: TranscriptRawResponse | null | undefined): TranscriptSegmentResponse[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    const first = raw[0] as { transcripts?: TranscriptSegmentResponse[] } | TranscriptSegmentResponse | undefined
    if (first && typeof first === "object" && "transcripts" in first && Array.isArray(first.transcripts))
      return first.transcripts
    return raw as TranscriptSegmentResponse[]
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const keys = Object.keys(raw).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b))
    return keys.map((k) => (raw as Record<string, TranscriptSegmentResponse>)[k]).filter(Boolean)
  }
  return []
}

function mapVoiceHarkClipToSuggested(clip: VoiceHarkClipItem): SuggestedClipItem {
  return {
    startTime: clip.startTime,
    endTime: clip.endTime,
    headline: clip.headline,
    title: clip.headline,
    description: clip.description,
    notableQuote: clip.notableQuote,
    confidenceScore: clip.confidenceScore,
    rating: clip.rating,
  }
}

function getCategoryLabel(categoryId: number): string {
  for (const group of Object.values(TRANSCRIPT_CATEGORY_GROUPS)) {
    const found = group.find((c) => c._id === categoryId)
    if (found) return found.label
  }
  return `Category ${categoryId}`
}

const DEFAULT_TOP_HEIGHT = 400
/** Spec: dynamicHeight = max(screenHeight - 250 - 20, 400). */
function calculateDynamicHeight(): number {
  if (typeof window === "undefined") return DEFAULT_TOP_HEIGHT
  return Math.max(window.innerHeight - 270, DEFAULT_TOP_HEIGHT)
}

export function TranscriptDetail() {
  const { podcastSlug, episodeSlug, keyword } = useParams<{
    podcastSlug?: string
    episodeSlug?: string
    keyword?: string
  }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isSxm = location.pathname.includes("/transcript-detail/sxm/")
  const isKeyword = location.pathname.includes("/transcript-detail/keyword/")
  const isVanillaVideo = podcastSlug === "vanilla-video-transcripts"
  const me = useSelector((s: RootState) => s.auth.me) as { uid?: string; name?: string } | null

  const audioTrimmerRef = React.useRef<AudioTrimmerRef>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [episodeTitle, setEpisodeTitle] = React.useState("Transcript Detail")
  const [podcastName, setPodcastName] = React.useState("")
  const [episodeSubtitle, _setEpisodeSubtitle] = React.useState("")
  const [audioUrl, setAudioUrl] = React.useState<string | undefined>()
  const [duration, setDuration] = React.useState<number | undefined>()
  const [transcript, setTranscript] = React.useState<TranscriptSegment[]>([])
  const [currentTime, setCurrentTime] = React.useState(0)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [activeClip, setActiveClip] = React.useState<ActiveClip | null>(null)
  const [selectedClip, setSelectedClip] = React.useState<SuggestedClipItem | null>(null)
  const [showTranscriptSearch, setShowTranscriptSearch] = React.useState(false)
  const [suggestedClips, setSuggestedClips] = React.useState<SuggestedClipItem[]>([])
  const [voiceHarkSuggestions, setVoiceHarkSuggestions] = React.useState<{ category_id: number; model_used: string; clips: VoiceHarkClipItem[] }[]>([])
  const [suggestionTabIndex, setSuggestionTabIndex] = React.useState(0)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false)
  const [loadingMessage, setLoadingMessage] = React.useState<string | null>(null)
  const [dynamicHeight, setDynamicHeight] = React.useState(DEFAULT_TOP_HEIGHT)
  const [downloadOpen, setDownloadOpen] = React.useState(false)
  const [regenerating, setRegenerating] = React.useState(false)

  const [selectedCategoryGroup, setSelectedCategoryGroup] = React.useState<CategoryGroupId>("V4")
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("301")
  const [selectedModelId, setSelectedModelId] = React.useState<string>("nova_lite")
  const [curationGuidance, setCurationGuidance] = React.useState("")
  const [episodeId, setEpisodeId] = React.useState<string | undefined>()

  const episodeData = React.useMemo(
    () =>
      podcastSlug && episodeSlug
        ? {
            _id: episodeId,
            podcast_name: podcastName,
            name: episodeTitle,
            s3audioUrl: audioUrl,
            duration,
            podcastSlug,
            episodeSlug,
            artistName: episodeSubtitle,
          }
        : undefined,
    [episodeId, podcastName, episodeTitle, audioUrl, duration, podcastSlug, episodeSlug, episodeSubtitle]
  )

  /** Spec (TRANSCRIPT_DETAIL_COMPONENT_SPEC): generatePeaksUrl(episodeData) — null when episode data is missing or lacks podcastSlug or episodeSlug. */
  const peaksUrl = React.useMemo(() => {
    if (!episodeData || !episodeData.podcastSlug || !episodeData.episodeSlug) return undefined
    return `${IMAGE_PATH}/episode-waveforms/${episodeData.podcastSlug}/${episodeData.episodeSlug}/10pps.json`
  }, [episodeData])

  const handleAddNewClipInfo = React.useCallback((payload: Record<string, unknown>) => {
    createAnswer(payload).catch((err) => {
      console.error("Create clip failed:", err)
    })
  }, [])

  const effectiveEpisodeSlug = episodeSlug ?? keyword
  const effectivePodcastSlug = isSxm ? podcastSlug : isVanillaVideo ? undefined : podcastSlug

  const loadVoiceHarkSuggestions = React.useCallback(
    async (epId: string) => {
      if (!epId) return
      setIsLoadingSuggestions(true)
      setLoadingMessage("Fetching Clip Suggestions…")
      try {
        const categoryId = selectedCategoryId ? parseInt(selectedCategoryId, 10) : undefined
        const res = await getVoiceHarkClipSuggestions({
          episode_id: epId,
          category_id: Number.isNaN(categoryId) ? undefined : categoryId,
          llm_model: selectedModelId || undefined,
          curation_guidance: curationGuidance || undefined,
        })
        const list = Array.isArray(res?.data) ? res.data.filter((x) => x.category_id != null) : []
        setVoiceHarkSuggestions(list)
        setSuggestionTabIndex(0)
        const first = list[0]
        const clips = first?.clips ?? []
        setSuggestedClips(clips.map(mapVoiceHarkClipToSuggested))
      } catch (e) {
        setSuggestedClips([])
        setVoiceHarkSuggestions([])
      } finally {
        setIsLoadingSuggestions(false)
        setLoadingMessage(null)
      }
    },
    [selectedCategoryId, selectedModelId, curationGuidance]
  )

  const loadVoiceHarkSuggestionsRef = React.useRef(loadVoiceHarkSuggestions)
  loadVoiceHarkSuggestionsRef.current = loadVoiceHarkSuggestions

  // Spec: selectedClip from location.state on mount; clear from history.
  React.useEffect(() => {
    const stateClip = (location.state as { selectedClip?: SuggestedClipItem } | null)?.selectedClip
    if (stateClip) {
      setSelectedClip(stateClip)
      setSelectedCategoryGroup("V4")
      setSelectedCategoryId("301")
      setSelectedModelId("nova_lite")
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  // Spec: dynamicHeight and resize listener.
  React.useEffect(() => {
    setDynamicHeight(calculateDynamicHeight())
    const handleResize = () => setDynamicHeight(calculateDynamicHeight())
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    if (!effectiveEpisodeSlug && !isKeyword) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    setTranscript([])
    setSuggestedClips([])
    setVoiceHarkSuggestions([])

    const handleEpisodeDetails = (details: {
      _id?: string
      s3audioUrl?: string
      audioUrl?: string
      duration?: number
      podcast_name?: string
      name?: string
      artistName?: string
      podcastSlug?: string
      episodeSlug?: string
    }) => {
      if (cancelled) return
      const id = details._id
      const url = details.s3audioUrl ?? details.audioUrl
      const dur = details.duration
      setEpisodeId(id)
      setPodcastName(details.podcast_name ?? "")
      setEpisodeTitle(details.name ?? "Transcript Detail")
      setAudioUrl(url)
      setDuration(dur != null ? Number(dur) : undefined)
      if (id) loadVoiceHarkSuggestionsRef.current(id)
    }

    const run = async () => {
      try {
        if (isSxm && podcastSlug && episodeSlug) {
          const res = await getSxmEpisodeDetails(podcastSlug, episodeSlug)
          const raw = res as { details?: Record<string, unknown> } & Record<string, unknown>
          const details = raw?.details ?? raw
          const d = details as { _id?: string; s3audioUrl?: string; audioUrl?: string; duration?: number; podcast_name?: string; name?: string; artistName?: string; podcastSlug?: string; episodeSlug?: string }
          handleEpisodeDetails(d)
          const slug = d.podcastSlug ?? podcastSlug
          const epSlug = d.episodeSlug ?? episodeSlug
          const transcriptRaw = await getSingleEpisodeTranscript(epSlug, slug).catch(() => null)
          if (!cancelled) {
            const segments = normalizeTranscriptRaw(transcriptRaw).map(mapTranscriptSegment)
            setTranscript(segments)
          }
          return
        }
        if (isVanillaVideo && episodeSlug) {
          const list = await getVanillaVideoList().catch(() => [])
          const arr = Array.isArray(list) ? list : []
          const episode = arr.find((e) => (e.vanillaVideoSlug ?? e.episodeSlug) === episodeSlug)
          if (cancelled) return
          if (episode) {
            handleEpisodeDetails({
              _id: episode._id as string,
              audioUrl: episode.audioUrl,
              duration: episode.duration,
              name: episode.name,
              podcast_name: episode.podcast_name as string,
              podcastSlug: episode.podcastSlug,
              episodeSlug: episode.episodeSlug,
            })
            setTranscript(episode.transcript as TranscriptSegment[])
          }
          setIsLoading(false)
          return
        }
        if (effectiveEpisodeSlug) {
          const res = await getEpisodeDetails(effectiveEpisodeSlug)
          const details = res?.details
          if (cancelled) return
          if (details) {
            handleEpisodeDetails(details)
            const pSlug = details.podcastSlug ?? effectivePodcastSlug
            if (pSlug) {
              const transcriptRaw = await getSingleEpisodeTranscript(effectiveEpisodeSlug, pSlug).catch(() => null)
              if (!cancelled) {
                const segments = normalizeTranscriptRaw(transcriptRaw).map(mapTranscriptSegment)
                setTranscript(segments)
              }
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [podcastSlug, episodeSlug, keyword, isSxm, isKeyword, isVanillaVideo, effectiveEpisodeSlug, effectivePodcastSlug])

  const handleTranscriptClick = React.useCallback(
    (startTime: number, endTime: number) => {
      setCurrentTime(startTime)
      setActiveClip({ startTime, endTime })
      audioTrimmerRef.current?.seekAndPlay(startTime)
    },
    []
  )

  const handleCurrentTimeUpdate = React.useCallback((t: number) => {
    setCurrentTime(t)
  }, [])

  const handlePlayStateChange = React.useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  const handlePlayClip = React.useCallback((clip: SuggestedClipItem) => {
    setActiveClip({ startTime: clip.startTime, endTime: clip.endTime })
    setSelectedClip(clip)
    setCurrentTime(clip.startTime ?? 0)
    setIsPlaying(true)
    audioTrimmerRef.current?.seekAndPlay(clip.startTime ?? 0)
  }, [])

  const handleCreateClip = React.useCallback((clip: SuggestedClipItem) => {
    setActiveClip({ startTime: clip.startTime, endTime: clip.endTime })
    setSelectedClip(clip)
    audioTrimmerRef.current?.seekAndPlay(clip.startTime)
    // Parent would open Create Clip modal or focus trimmer Create Clip button
  }, [])

  const handleRefreshSuggestions = React.useCallback(() => {
    if (episodeId) loadVoiceHarkSuggestions(episodeId)
  }, [episodeId, loadVoiceHarkSuggestions])

  const handleTrimChange = React.useCallback(() => {}, [])

  /** Spec: build text from transcript (time + speaker + sentence), blob, download. */
  const handleDownloadTranscript = React.useCallback(() => {
    if (!transcript.length) return
    const lines = transcript.map((seg) => {
      const start = typeof seg.start_time === "number" ? seg.start_time : 0
      const t = formatTime(start)
      const speaker = seg.speaker ?? ""
      const text = (seg.sentence ?? seg.text ?? "") as string
      return `[${t}] ${speaker ? speaker + ": " : ""}${text}`
    })
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transcript-${episodeTitle.replace(/\s+/g, "-") || "episode"}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloadOpen(false)
  }, [transcript, episodeTitle])

  /** Spec: Episode Chunks (clipChunksGetUrl when available). */
  const handleDownloadEpisodeChunks = React.useCallback(() => {
    const url = (episodeData as { clipChunksGetUrl?: string } | undefined)?.clipChunksGetUrl
    if (url) {
      try {
        const a = document.createElement("a")
        a.href = url
        a.download = ""
        a.rel = "noopener"
        a.click()
      } catch {
        window.open(url, "_blank")
      }
    }
    setDownloadOpen(false)
  }, [episodeData])

  /** Spec: open audio URL in new tab. */
  const handleDownloadAudio = React.useCallback(() => {
    if (audioUrl) window.open(audioUrl, "_blank")
    setDownloadOpen(false)
  }, [audioUrl])

  /** Spec: regenerate transcript (requestEpisodeTranscript then refetch). */
  const handleRegenerateTranscript = React.useCallback(async () => {
    if (!episodeData || regenerating) return
    setRegenerating(true)
    try {
      await requestEpisodeTranscript(episodeData as Record<string, unknown>, true)
      if (effectiveEpisodeSlug && effectivePodcastSlug) {
        const transcriptRaw = await getSingleEpisodeTranscript(effectiveEpisodeSlug, effectivePodcastSlug).catch(() => null)
        const segments = normalizeTranscriptRaw(transcriptRaw).map(mapTranscriptSegment)
        setTranscript(segments)
      }
    } finally {
      setRegenerating(false)
    }
  }, [episodeData, effectiveEpisodeSlug, effectivePodcastSlug, regenerating])

  if (isLoading && !transcript.length) {
    return <LoadingState message="Loading transcript…" />
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        <p>{error}</p>
      </div>
    )
  }

  const suggestionTabs =
    voiceHarkSuggestions.length > 0
      ? voiceHarkSuggestions.map((s, i) => ({
          id: String(i),
          label: `${getCategoryLabel(s.category_id)} · ${s.model_used}`,
        }))
      : [
          { id: "0", label: "V4" },
          { id: "vtest", label: "VTest" },
        ]
  const activeSuggestionTabId = String(suggestionTabIndex)
  const clipsForPanel =
    voiceHarkSuggestions[suggestionTabIndex]?.clips?.map(mapVoiceHarkClipToSuggested) ?? suggestedClips

  const handleSuggestionTabChange = (id: string) => {
    const idx = parseInt(id, 10)
    if (!Number.isNaN(idx) && idx >= 0 && idx < voiceHarkSuggestions.length) {
      setSuggestionTabIndex(idx)
    }
  }

  return (
    <div
      className="transcript-detail-container flex flex-col overflow-hidden"
      style={{ height: "calc(100vh - 160px)", minHeight: 0 }}
    >
      {/* Breadcrumbs */}
      <nav className="flex shrink-0 items-center gap-1 border-b px-4 py-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span aria-hidden>/</span>
        <Link to="/dashboard" className="hover:text-foreground">
          Transcript Detail
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">{episodeTitle}</span>
      </nav>

      {/* Spec: top row with dynamicHeight */}
      <div
        className="flex min-h-0 flex-1 items-stretch overflow-hidden"
        style={{ height: dynamicHeight, minHeight: 0 }}
      >
        {/* Left: Transcript card (spec: Transcript header + Auto-scroll, Search, Regenerate, Download) */}
        <div className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden border-r self-stretch">
          {/* Transcript card header — spec: title, podcast/episode, Auto-scroll, Search, Regenerate, Download */}
          <div className="card-header sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 shadow-sm">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Transcript</h1>
              {podcastName && (
                <p className="mt-1 text-sm font-medium text-foreground">{podcastName}</p>
              )}
              {episodeSubtitle && (
                <p className="text-sm text-muted-foreground">{episodeSubtitle}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTranscriptSearch((v) => !v)}
                aria-pressed={showTranscriptSearch}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={regenerating || !episodeData}
                onClick={handleRegenerateTranscript}
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </Button>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDownloadOpen((o) => !o)}
                  aria-expanded={downloadOpen}
                  aria-haspopup="true"
                >
                  Download
                </Button>
                {downloadOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setDownloadOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border bg-popover py-1 shadow-md">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={handleDownloadTranscript}
                      >
                        Transcript
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={handleDownloadEpisodeChunks}
                      >
                        Episode Chunks
                      </button>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={handleDownloadAudio}
                        disabled={!audioUrl}
                      >
                        Audio
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top bar: category group, category, model, curation guidance, Generate (spec) */}
          <div className="flex shrink-0 flex-wrap items-end gap-3 border-b px-4 py-3">
            <Select
              value={selectedCategoryGroup}
              onValueChange={(v) => {
                setSelectedCategoryGroup(v as CategoryGroupId)
                const cats = TRANSCRIPT_CATEGORY_GROUPS[v as CategoryGroupId]
                if (cats?.length) setSelectedCategoryId(String(cats[0]._id))
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TRANSCRIPT_CATEGORY_GROUPS) as CategoryGroupId[]).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {TRANSCRIPT_CATEGORY_GROUPS[selectedCategoryGroup]?.map((c) => (
                  <SelectItem key={c._id} value={String(c._id)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {TRANSCRIPT_MODELS.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Curation guidance"
              value={curationGuidance}
              onChange={(e) => setCurationGuidance(e.target.value)}
              className="max-w-[200px]"
            />
            <Button type="button" size="sm">
              Generate
            </Button>
          </div>

          {/* Transcript - scrollable area (spec: CardBody overflow) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <TranscriptView
              transcriptData={transcript}
              segments={transcript}
              currentTime={currentTime}
              isPlaying={isPlaying}
              autoScrollEnabled={autoScroll}
              autoScroll={autoScroll}
              onAutoScrollChange={setAutoScroll}
              showSearchBar={showTranscriptSearch}
              onSearchBarClose={() => setShowTranscriptSearch(false)}
              onTranscriptClick={handleTranscriptClick}
              selectedClip={selectedClip ?? undefined}
              onRefreshClick={() => {}}
              onDownload={() => {}}
              downloadLabel="Download"
            />
          </div>

        </div>

        {/* Right: Clip suggestions (spec: category tabs, SuggestClip, loading/error) */}
        <div className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden self-stretch">
          <SuggestedClipsPanel
            categoryTabs={suggestionTabs}
            activeTabId={activeSuggestionTabId}
            onTabChange={handleSuggestionTabChange}
            interviewLabel={
              voiceHarkSuggestions[suggestionTabIndex]
                ? getCategoryLabel(voiceHarkSuggestions[suggestionTabIndex].category_id)
                : "Serious Interview V4"
            }
            interviewSubLabel={
              voiceHarkSuggestions[suggestionTabIndex]?.model_used?.toUpperCase() ?? "NOVA_LITE"
            }
            clips={voiceHarkSuggestions.length > 0 ? clipsForPanel : suggestedClips}
            selectedClip={selectedClip}
            onPlayClip={handlePlayClip}
            onCreateClip={handleCreateClip}
            onRefresh={handleRefreshSuggestions}
            isLoading={isLoadingSuggestions}
            loadingMessage={loadingMessage}
            error={undefined}
            emptyMessage="No suggested clips for this category."
            enableSelectedClipAutoplay
          />
        </div>

      </div>

      {/* Spec: bottom row — Audio Trimmer (flex: 0 0 250px equivalent via shrink-0) */}
      <div className="shrink-0 border-t bg-muted/20 px-4 py-3">
            {audioUrl ? (
              <AudioTrimmer
                ref={audioTrimmerRef}
                audioUrl={audioUrl}
                duration={duration}
                peaksUrl={peaksUrl ?? undefined}
                activeClip={activeClip}
                episodeData={episodeData}
                onTrimChange={handleTrimChange}
                onCurrentTimeUpdate={handleCurrentTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                addNewClipInfo={handleAddNewClipInfo}
                showCreateClipButton
                user={me ? { uid: me.uid ?? "", name: me.name ?? "" } : undefined}
                fetchAllTags={fetchAllTags}
                fetchGenreTags={fetchGenreTags}
                fetchToneTags={fetchToneTags}
                type={isSxm ? "sxmEpisode" : isVanillaVideo ? "vanillaVideo" : undefined}
                isAutoPlay
              />
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No audio URL for this episode. Connect episode API (e.g. episodePlayTranscript) to load audio and use the trimmer.
              </div>
            )}
          </div>
    </div>
  )
}
