/**
 * AddClipsContainer — Add a clip flow (ADD_CLIPS_CONTAINER_SPEC).
 * Step 1: Select podcast (external/internal) → Step 2: Select episode →
 * Step 3: Trim (player) → Step 4: Title, description, intro, Harklist (optional), Submit.
 */
import * as React from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import useDebounce from "@/customHook/useDebounce"
import { AudioTrimmer } from "@/components/AudioTrimmer"
import {
  fetchQuestionDetail,
  searchExternalPodcastList,
  fetchInternalPodcasts,
  getPodcastEpisodesFromRss,
  getEpisodeS3Url,
  createAnswer,
  searchHarkListForAddClip,
  uploadIntroOutroOrImage,
  type ExternalPodcastItem,
  type EpisodeDetailItem,
  type HarklistSearchItem,
  type QuestionDetailResponse,
} from "@/lib/api"

const DEBOUNCE_MS = 500
const POLL_INTERVAL_MS = 5000
const CLIP_TITLE_MAX = 75
const CLIP_DESCRIPTION_MAX = 170

/** Pre-fill from SuggestClip (playlistDetail in location.state or Redux) */
export type PlaylistDetailPreFill = {
  title?: string
  description?: string
  startTime?: number
  endTime?: number
  podcastName?: string
  podcastSlug?: string
  episodeTitle?: string
  episodeSlug?: string
  [key: string]: unknown
}

export type AddClipsContainerProps = {
  /** When true (e.g. Make a Clip page), hide External/Internal radios; clip attaches to Harklist chosen in Step 4 */
  isfromMakeClip?: boolean
  /** Pre-fill from SuggestClip (e.g. from location.state or Redux playlistDetail) */
  playlistDetail?: PlaylistDetailPreFill | null
}

type PodcastType = "external" | "internal"

export function AddClipsContainer({ isfromMakeClip = false, playlistDetail: playlistDetailProp }: AddClipsContainerProps) {
  const { playlist: playlistIdParam } = useParams<{ playlist: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const playlistDetail = (location.state as { playlistDetail?: PlaylistDetailPreFill } | null)?.playlistDetail ?? playlistDetailProp ?? null

  const questionsId = playlistIdParam ? String(playlistIdParam) : null

  // Question detail (when route has :playlist)
  const [questionDetail, setQuestionDetail] = React.useState<QuestionDetailResponse | null>(null)
  const [questionDetailLoading, setQuestionDetailLoading] = React.useState(!!questionsId)
  const [questionDetailError, setQuestionDetailError] = React.useState<string | null>(null)

  // Step 1 — Podcast
  const [type, setType] = React.useState<PodcastType>("external")
  const [podcastqs, setPodcastqs] = React.useState("")
  const debouncedPodcastQs = useDebounce(podcastqs, DEBOUNCE_MS)
  const [podcastList, setPodcastList] = React.useState<ExternalPodcastItem[]>([])
  const [selectedPodcast, setSelectedPodcast] = React.useState<ExternalPodcastItem | null>(null)
  const [podcastSearchLoading, setPodcastSearchLoading] = React.useState(false)

  // Step 2 — Episode
  const [episodeList, setEpisodeList] = React.useState<EpisodeDetailItem[]>([])
  const [episodeQs, setEpisodeQs] = React.useState("")
  const [selectedEpisode, setSelectedEpisode] = React.useState<EpisodeDetailItem | null>(null)
  const [episodesLoading, setEpisodesLoading] = React.useState(false)
  const [isPodcastBlocked, setIsPodcastBlocked] = React.useState(false)

  // Step 3 — Player / Trim
  const [s3AudioUrl, setS3AudioUrl] = React.useState<string | null>(null)
  const [isPlayerVisible, setIsPlayerVisible] = React.useState(false)
  const [startTime, setStartTime] = React.useState(0)
  const [endTime, setEndTime] = React.useState(60)
  const [isSaveClip, setIsSaveClip] = React.useState(false)
  const [episodeS3Loading, setEpisodeS3Loading] = React.useState(false)
  const [episodeS3Error, setEpisodeS3Error] = React.useState<string | null>(null)

  // Step 4 — Title, description, intro, Harklist, submit
  const [clipName, setClipName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [introUrl, setIntroUrl] = React.useState<string | null>(null)
  const [introFile, setIntroFile] = React.useState<File | null>(null)
  const [harklistqs, setHarklistqs] = React.useState("")
  const debouncedHarklistQs = useDebounce(harklistqs, DEBOUNCE_MS)
  const [harklistResults, setHarklistResults] = React.useState<HarklistSearchItem[]>([])
  const [harkListId, setHarkListId] = React.useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = React.useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Pre-fill / auto-select (SuggestClip)
  const [pendingEpisodeTitle, setPendingEpisodeTitle] = React.useState<string | null>(null)
  const [pendingPodcastSlug, setPendingPodcastSlug] = React.useState<string | null>(null)
  const [autoSelectInProgress, setAutoSelectInProgress] = React.useState(false)

  const currentStep = React.useMemo(() => {
    if (!selectedPodcast) return 1
    if (!selectedEpisode) return 2
    if (!isSaveClip) return 3
    return 4
  }, [selectedPodcast, selectedEpisode, isSaveClip])

  // Fetch question detail when route has :playlist
  React.useEffect(() => {
    if (!questionsId) return
    setQuestionDetailLoading(true)
    setQuestionDetailError(null)
    fetchQuestionDetail(questionsId)
      .then((data) => {
        setQuestionDetail(data)
      })
      .catch((err) => {
        setQuestionDetailError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        setQuestionDetailLoading(false)
      })
  }, [questionsId])

  // Pre-fill from playlistDetail (SuggestClip)
  React.useEffect(() => {
    if (!playlistDetail) return
    if (playlistDetail.title) setClipName(playlistDetail.title)
    if (playlistDetail.description != null) setDescription(String(playlistDetail.description))
    if (typeof playlistDetail.startTime === "number") setStartTime(playlistDetail.startTime)
    if (typeof playlistDetail.endTime === "number") setEndTime(playlistDetail.endTime)
    setPendingEpisodeTitle(
      typeof playlistDetail.episodeTitle === "string"
        ? playlistDetail.episodeTitle
        : typeof playlistDetail.name === "string"
          ? playlistDetail.name
          : null
    )
    setPendingPodcastSlug(typeof playlistDetail.podcastSlug === "string" ? playlistDetail.podcastSlug : null)
    if (playlistDetail.podcastName) {
      setPodcastqs(playlistDetail.podcastName)
      setAutoSelectInProgress(true)
    }
  }, [playlistDetail])

  // Podcast search (external or internal)
  React.useEffect(() => {
    if (!debouncedPodcastQs.trim()) {
      setPodcastList([])
      return
    }
    setPodcastSearchLoading(true)
    const isExternal = type === "external"
    const promise = isExternal
      ? searchExternalPodcastList(debouncedPodcastQs, 0, 10)
      : fetchInternalPodcasts(debouncedPodcastQs, 0, 10)
    promise
      .then((res) => {
        const list = (res as { data?: ExternalPodcastItem[]; list?: ExternalPodcastItem[] }).data
          ?? (res as { data?: ExternalPodcastItem[]; list?: ExternalPodcastItem[] }).list
          ?? []
        setPodcastList(Array.isArray(list) ? list : [])
        // Auto-select first matching podcast when from SuggestClip
        if (autoSelectInProgress && list?.length) {
          const slug = pendingPodcastSlug?.toLowerCase()
          const match = (list as ExternalPodcastItem[]).find(
            (p) => !slug || (String(p.slug ?? p.podcastSlug ?? "").toLowerCase() === slug)
          )
          const first = (list as ExternalPodcastItem[])[0]
          const toSelect = match ?? first
          setSelectedPodcast(toSelect)
          setAutoSelectInProgress(false)
        }
      })
      .catch(() => setPodcastList([]))
      .finally(() => setPodcastSearchLoading(false))
  }, [debouncedPodcastQs, type, autoSelectInProgress, pendingPodcastSlug])

  // Load episodes when selected podcast changes (and we had no auto-select from playlistDetail)
  React.useEffect(() => {
    if (!selectedPodcast?.href) return
    setEpisodesLoading(true)
    setEpisodeList([])
    getPodcastEpisodesFromRss(selectedPodcast.href)
      .then(({ podcasts = [] }) => {
        const list = Array.isArray(podcasts) ? podcasts : []
        setEpisodeList(list)
        setIsPodcastBlocked((list as EpisodeDetailItem[]).some((e) => (e as { isClippingBlocked?: boolean }).isClippingBlocked))
        // Auto-select episode when we have pendingEpisodeTitle from SuggestClip
        if (pendingEpisodeTitle && list.length) {
          const titleLower = pendingEpisodeTitle.toLowerCase()
          const match = (list as EpisodeDetailItem[]).find(
            (ep) => (String(ep.name ?? ep.title ?? "").toLowerCase() === titleLower)
          )
          if (match) setSelectedEpisode(match)
        }
      })
      .catch(() => {
        setEpisodeList([])
      })
      .finally(() => setEpisodesLoading(false))
  }, [selectedPodcast?.href, pendingEpisodeTitle])

  // Episode list filter by search
  const filteredEpisodeList = React.useMemo(() => {
    if (!episodeQs.trim()) return episodeList
    const q = episodeQs.toLowerCase()
    return episodeList.filter(
      (ep) =>
        String(ep.name ?? ep.title ?? "").toLowerCase().includes(q)
    )
  }, [episodeList, episodeQs])

  // Harklist search (Step 4, when no questionsId)
  React.useEffect(() => {
    if (!debouncedHarklistQs.trim() || questionsId) {
      setHarklistResults([])
      return
    }
    searchHarkListForAddClip(debouncedHarklistQs, 0, 10)
      .then((res) => {
        const results = res.results ?? []
        const dict = res.dictionary ?? {}
        const list = Array.isArray(results)
          ? (results as string[]).map((id) => dict[id]).filter(Boolean)
          : []
        setHarklistResults(list)
      })
      .catch(() => setHarklistResults([]))
  }, [debouncedHarklistQs, questionsId])

  const handleTypeChange = (t: PodcastType) => {
    setType(t)
    setPodcastList([])
    setPodcastqs("")
    setSelectedPodcast(null)
  }

  const handlePodcastSelect = (item: ExternalPodcastItem) => {
    setSelectedPodcast(item)
  }

  const handleContinueFromPodcast = () => {
    if (!selectedPodcast?.href) return
    setEpisodesLoading(true)
    setEpisodeList([])
    getPodcastEpisodesFromRss(selectedPodcast.href)
      .then(({ podcasts = [] }) => {
        const list = Array.isArray(podcasts) ? podcasts : []
        setEpisodeList(list)
        setIsPodcastBlocked((list as EpisodeDetailItem[]).some((e) => (e as { isClippingBlocked?: boolean }).isClippingBlocked))
      })
      .finally(() => setEpisodesLoading(false))
  }

  const handleEpisodeSelect = (item: EpisodeDetailItem) => {
    setSelectedEpisode(item)
    const start = typeof (item as { startTime?: number }).startTime === "number" ? (item as { startTime: number }).startTime : 0
    const end = typeof (item as { endTime?: number }).endTime === "number" ? (item as { endTime: number }).endTime : Math.max(60, start + 60)
    setStartTime(start)
    setEndTime(end)
  }

  const pollEpisodeS3Url = React.useCallback(
    (episode: EpisodeDetailItem): Promise<string> => {
      const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined)
      return new Promise((resolve, reject) => {
        const attempt = () => {
          getEpisodeS3Url({
            id: str(episode._id),
            href: str(episode.href),
            podcastSlug: str(episode.podcastSlug ?? (episode as { podcast_slug?: string }).podcast_slug),
            audioUrl: str((episode as { audioUrl?: string }).audioUrl),
            episodeSlug: str(episode.episodeSlug ?? (episode as { episode_slug?: string }).episode_slug),
          })
            .then((r) => {
              if (r.status === "FINISHED" && r.s3audioUrl) {
                resolve(r.s3audioUrl)
                return
              }
              if (r.status === "ERROR") {
                reject(new Error(r.message ?? "Episode S3 failed"))
                return
              }
              setTimeout(attempt, POLL_INTERVAL_MS)
            })
            .catch(reject)
        }
        attempt()
      })
    },
    []
  )

  const handleContinueFromEpisode = async () => {
    if (!selectedEpisode) return
    const ep = selectedEpisode as EpisodeDetailItem & { s3audioUrl?: string; audioUrl?: string }
    setEpisodeS3Loading(true)
    setEpisodeS3Error(null)
    try {
      if (ep.s3audioUrl) {
        setS3AudioUrl(ep.s3audioUrl)
        setIsPlayerVisible(true)
      } else {
        const url = await pollEpisodeS3Url(selectedEpisode)
        setS3AudioUrl(url)
        setIsPlayerVisible(true)
      }
    } catch (err) {
      setEpisodeS3Error(err instanceof Error ? err.message : String(err))
    } finally {
      setEpisodeS3Loading(false)
    }
  }

  const handleTrimChange = (start: number, end: number) => {
    setStartTime(start)
    setEndTime(end)
  }

  const handleContinueFromTrim = () => {
    setIsSaveClip(true)
  }

  const questionIdForSubmit = questionsId
    ? Number(questionsId)
    : harkListId
      ? Number(harkListId)
      : selectedQuestion
        ? Number(selectedQuestion)
        : null

  const addClipHandler = async () => {
    if (!clipName.trim()) return
    if (questionIdForSubmit == null && !isfromMakeClip) {
      setSubmitError("Please select a Harklist or add from a question.")
      return
    }
    const qId = questionIdForSubmit ?? (harkListId ? Number(harkListId) : selectedQuestion ? Number(selectedQuestion) : undefined)
    if (qId == null) {
      setSubmitError("Please select a Harklist to attach this clip to.")
      return
    }

    setSubmitLoading(true)
    setSubmitError(null)
    try {
      let introContentUri = introUrl ?? ""
      if (introFile) {
        const { location: loc } = await uploadIntroOutroOrImage(introFile)
        introContentUri = loc
      }
      const episodePayload = {
        ...selectedEpisode,
        s3audioUrl: s3AudioUrl ?? (selectedEpisode as { s3audioUrl?: string }).s3audioUrl,
        startTime,
        endTime,
      }
      const payload: Record<string, unknown> = {
        questionId: qId,
        title: clipName.trim().slice(0, CLIP_TITLE_MAX),
        description: (description ?? "").trim().slice(0, CLIP_DESCRIPTION_MAX),
        rawText: "",
        podcast: episodePayload,
      }
      if (introContentUri) {
        payload.podcastIntro = {
          introText: "",
          startTime: 0,
          endTime: 0,
          duration: 0,
          contentURI: introContentUri,
          userId: "",
          userName: "",
          podcastName: selectedPodcast?.title ?? "",
        }
      }
      await createAnswer(payload)
      navigate("/dashboard/playlists")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitLoading(false)
    }
  }

  if (questionDetailLoading && questionsId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-muted-foreground">Loading question…</p>
      </div>
    )
  }

  if (questionDetailError && questionsId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-destructive">{questionDetailError}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Add a Clip</h1>
        {questionDetail?.title && (
          <p className="text-muted-foreground">Question: {questionDetail.title}</p>
        )}
      </header>

      {/* Step 1: Select podcast */}
      {currentStep >= 1 && (
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Step 1: Select a podcast</h2>
          {!isfromMakeClip && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="podcastType"
                  checked={type === "external"}
                  onChange={() => handleTypeChange("external")}
                />
                External
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="podcastType"
                  checked={type === "internal"}
                  onChange={() => handleTypeChange("internal")}
                />
                Internal
              </label>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="podcast-search">Search podcasts</Label>
            <Input
              id="podcast-search"
              value={podcastqs}
              onChange={(e) => setPodcastqs(e.target.value)}
              placeholder="Type to search…"
            />
          </div>
          {podcastSearchLoading && <p className="text-sm text-muted-foreground">Searching…</p>}
          {podcastList.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
              {podcastList.map((p, i) => (
                <li key={(p.href ?? p.slug ?? i) as string}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                      selectedPodcast === p && "bg-accent"
                    )}
                    onClick={() => handlePodcastSelect(p)}
                  >
                    {p.title ?? p.artistName ?? "Untitled"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedPodcast && (
            <Button onClick={handleContinueFromPodcast} disabled={episodesLoading}>
              {episodesLoading ? "Loading episodes…" : "Continue"}
            </Button>
          )}
        </section>
      )}

      {/* Step 2: Select episode */}
      {currentStep >= 2 && selectedPodcast && (
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Step 2: Select an episode</h2>
          <div className="grid gap-2">
            <Label htmlFor="episode-search">Filter episodes</Label>
            <Input
              id="episode-search"
              value={episodeQs}
              onChange={(e) => setEpisodeQs(e.target.value)}
              placeholder="Type to filter…"
            />
          </div>
          {isPodcastBlocked && (
            <p className="text-sm text-amber-600">Clipping may be restricted for this podcast.</p>
          )}
          {episodesLoading && <p className="text-sm text-muted-foreground">Loading episodes…</p>}
          {filteredEpisodeList.length > 0 && (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded border p-2">
              {filteredEpisodeList.map((ep, i) => (
                <li key={(ep as { _id?: string })._id ?? (ep.href ?? i) as string}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                      selectedEpisode === ep && "bg-accent"
                    )}
                    onClick={() => handleEpisodeSelect(ep)}
                  >
                    {ep.name ?? (ep as { title?: string }).title ?? "Untitled episode"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedEpisode && (
            <>
              <Button onClick={handleContinueFromEpisode} disabled={episodeS3Loading}>
                {episodeS3Loading ? "Preparing audio…" : "Continue"}
              </Button>
              {episodeS3Error && <p className="text-sm text-destructive">{episodeS3Error}</p>}
            </>
          )}
        </section>
      )}

      {/* Step 3: Trim */}
      {currentStep >= 3 && isPlayerVisible && s3AudioUrl && selectedEpisode && (
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Step 3: Create your clip (set start and end)</h2>
          <AudioTrimmer
            audioUrl={s3AudioUrl}
            duration={(selectedEpisode as { duration?: number }).duration}
            activeClip={{ startTime: startTime, endTime: endTime }}
            onTrimChange={handleTrimChange}
            hideEditingControls={false}
          />
          <Button onClick={handleContinueFromTrim}>Continue to title &amp; submit</Button>
        </section>
      )}

      {/* Step 4: Title, description, intro, Harklist, submit */}
      {currentStep >= 4 && (
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Step 4: Add title and submit</h2>
          <div className="grid gap-2">
            <Label htmlFor="clip-title">Clip title (required, max {CLIP_TITLE_MAX})</Label>
            <Input
              id="clip-title"
              value={clipName}
              onChange={(e) => setClipName(e.target.value.slice(0, CLIP_TITLE_MAX))}
              placeholder="Enter clip title"
              maxLength={CLIP_TITLE_MAX}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="clip-desc">Description (optional, max {CLIP_DESCRIPTION_MAX})</Label>
            <Input
              id="clip-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, CLIP_DESCRIPTION_MAX))}
              placeholder="Optional description"
              maxLength={CLIP_DESCRIPTION_MAX}
            />
          </div>
          <div className="grid gap-2">
            <Label>Intro audio (optional)</Label>
            <Input
              type="url"
              value={introUrl ?? ""}
              onChange={(e) => setIntroUrl(e.target.value.trim() || null)}
              placeholder="Paste MP3 URL or upload file below"
            />
            <Input
              type="file"
              accept="audio/*"
              onChange={(e) => setIntroFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {!questionsId && (
            <div className="grid gap-2">
              <Label>Select Harklist (required when not adding from a question)</Label>
              <Input
                value={harklistqs}
                onChange={(e) => setHarklistqs(e.target.value)}
                placeholder="Search Harklists…"
              />
              {harklistResults.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                  {harklistResults.map((h) => (
                    <li key={h._id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                          (harkListId === h._id || selectedQuestion === h._id) && "bg-accent"
                        )}
                        onClick={() => {
                          setHarkListId(h._id)
                          setSelectedQuestion(h._id)
                        }}
                      >
                        {h.title ?? h._id}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <Button
            onClick={addClipHandler}
            disabled={!clipName.trim() || submitLoading || (!questionsId && !harkListId && !selectedQuestion)}
          >
            {submitLoading ? "Submitting…" : "Submit clip"}
          </Button>
        </section>
      )}
    </div>
  )
}
