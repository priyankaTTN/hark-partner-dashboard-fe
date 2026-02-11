import { DASHBOARD_BASE_URL } from "@/config/constant"

/**
 * Send Bearer token so dashboard API accepts the request.
 * Cookie-only auth often returns 401 when the app runs on a different origin (e.g. localhost)
 * than the API (e.g. dashboard.harkaudio.com), because the browser doesn’t send that cookie cross-origin.
 */
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

type FetchAPIOptions = {
  method?: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

export async function fetchAPI<T = unknown>(
  path: string,
  options: FetchAPIOptions = {}
): Promise<T> {
  const { method = "GET", body, headers: customHeaders = {}, credentials } = options
  const url = `${DASHBOARD_BASE_URL}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...customHeaders,
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
    credentials: credentials ?? "include",
  })
  if (!res.ok) {
    const errText = await res.text()
    let errMessage = errText
    try {
      const errJson = JSON.parse(errText)
      errMessage = errJson.message ?? errJson.error ?? errText
    } catch {
      // use errText as-is
    }
    throw new Error(errMessage || `Request failed: ${res.status}`)
  }
  const contentType = res.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>
  }
  return res.text() as Promise<T>
}

export const login = (username: string, password: string) =>
  fetchAPI<{ token?: string }>("/api/v1/auth/milq", {
    method: "POST",
    body: { username, password },
  })
export const fetchMe = () =>
  fetchAPI<{ id: string; email: string; name: string }>("/api/v0/me", {
    method: "GET",
    credentials: "include",
  })

export type CreateQuestionPayload = {
  title: string
  description?: string
  color: string
  hidden: boolean
  allowSameNamePlaylist: boolean
  allowSuggestion: boolean
}

export const createQuestion = (body: CreateQuestionPayload) =>
  fetchAPI<unknown>("/api/v1/questions", {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

export const deleteQuestion = (id: string | number) =>
  fetchAPI<unknown>(`/api/v0/questions/${id}`, {
    method: "DELETE",
    credentials: "include",
  })

// Playlist (question) detail — SERVICES §3: GET /api/v0/dashboard/questions/:id
export type PlaylistIntroOutro = {
  contentURI?: string
  duration?: number
  endTime?: number
}

/** Intro/outro come from the API in question.customAttributes */
export type QuestionCustomAttributes = {
  playlistIntro?: PlaylistIntroOutro
  playlistOutro?: PlaylistIntroOutro
}

export type QuestionDetailResponse = {
  _id: string
  title: string
  description?: string
  creationDate?: string | number
  href?: string
  display?: boolean
  allowSuggestion?: boolean
  color?: string
  foregroundColor?: string
  backgroundColor?: string
  clipMainColor?: string
  clipAlternativeColor?: string
  creator?: { _id: string; name?: string; userName?: string }
  answerCount?: number
  tags?: Array<{ _id: string; name: string } | string>
  genres?: Array<{ _id: string; name: string } | string>
  tones?: Array<{ _id: string; name: string } | string>
  hidden?: boolean
  allowSameNamePlaylist?: boolean
  metaTag?: { title?: string; description?: string }
  isCached?: boolean
  displayAlternateImage?: boolean
  customAttributes?: QuestionCustomAttributes
  [key: string]: unknown
}

export type AnswerClip = {
  _id: string
  title?: string
  type?: string
  imageUrl?: string
  creationDate?: string | number
  [key: string]: unknown
}

export type QuestionAnswersResponse = {
  answers?: AnswerClip[]
  totalAnswers?: number
  total?: number
}

/** Full URL for question detail — SERVICES §3: GET /api/v0/dashboard/questions/:id */
export function getQuestionDetailUrl(id: string | undefined, refreshKey?: number): string {
  if (!id) return ""
  const base = `${DASHBOARD_BASE_URL}/api/v0/dashboard/questions/${id}`
  return refreshKey != null ? `${base}?_refresh=${refreshKey}` : base
}

/** Full URL for question answers — SERVICES §4: GET /api/v0/dashboard/dashboard-answers?question=:id */
export function getQuestionAnswersUrl(questionId: string | undefined, refreshKey?: number): string {
  if (!questionId) return ""
  const base = `${DASHBOARD_BASE_URL}/api/v0/dashboard/dashboard-answers?question=${questionId}`
  return refreshKey != null ? `${base}&_refresh=${refreshKey}` : base
}

/** Save question — SERVICES §3: POST /api/v1/questions/:id, body { ...editOptions, allowSameNamePlaylist } */
export type EditQuestionPayload = {
  title?: string
  description?: string
  color?: string
  foregroundColor?: string
  backgroundColor?: string
  clipMainColor?: string
  clipAlternativeColor?: string
  customAttributes?: QuestionCustomAttributes
  isCustomImagePath?: boolean
  customImagePath?: string
  updateTime?: number
  displayAlternateImage?: boolean
  allowSameNamePlaylist?: boolean
}

export const updateQuestion = (id: string | number, body: EditQuestionPayload) =>
  fetchAPI<unknown>(`/api/v1/questions/${id}`, {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

/** Display toggle — SERVICES §3: POST (show) / DELETE (hide) /api/v0/questions/:id/display */
export const setQuestionDisplay = (id: string | number, display: boolean) =>
  fetchAPI<unknown>(`/api/v0/questions/${id}/display`, {
    method: display ? "POST" : "DELETE",
    credentials: "include",
  })

/** Allow suggestion toggle — SERVICES §3: POST (allow) / DELETE (disallow) /api/v0/questions/:id/allowsuggestion */
export const setQuestionAllowSuggestion = (id: string | number, allow: boolean) =>
  fetchAPI<unknown>(`/api/v0/questions/${id}/allowsuggestion`, {
    method: allow ? "POST" : "DELETE",
    credentials: "include",
  })

/** Meta tags (SEO) — SERVICES §3: POST /api/v0/dashboard/question/metaTags */
export const saveQuestionMetaTags = (payload: {
  id: string | number
  title?: string
  description?: string
}) =>
  fetchAPI<unknown>("/api/v0/dashboard/question/metaTags", {
    method: "POST",
    body: payload as Record<string, unknown>,
    credentials: "include",
  })

// --- Tags / Genres / Tones — SERVICES §6 ---
export type TagGenreToneItem = { _id: string; name: string; [key: string]: unknown }

export type TagsListResponse = { tags?: TagGenreToneItem[]; tagList?: TagGenreToneItem[]; totalTags?: number }
export type GenresListResponse = { genres?: TagGenreToneItem[]; genreList?: TagGenreToneItem[]; totalGenres?: number }
export type TonesListResponse = { tones?: TagGenreToneItem[]; toneList?: TagGenreToneItem[]; totalTones?: number }

/** Full URL for tags list — GET /api/v0/tags?limit=0 */
export function getTagsUrl(): string {
  return `${DASHBOARD_BASE_URL}/api/v0/tags?limit=0`
}
/** Full URL for genres list — GET /api/v0/genres?limit=0 */
export function getGenresUrl(): string {
  return `${DASHBOARD_BASE_URL}/api/v0/genres?limit=0`
}
/** Full URL for tones list — GET /api/v0/tones?limit=0 */
export function getTonesUrl(): string {
  return `${DASHBOARD_BASE_URL}/api/v0/tones?limit=0`
}

/** Set tags on question — POST /api/v0/entity/tags */
export const setEntityTags = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/tags", {
    method: "POST",
    body: { entity, type: "questions", tags: ids } as Record<string, unknown>,
    credentials: "include",
  })
/** Set genres on question — POST /api/v0/entity/genres */
export const setEntityGenres = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/genres", {
    method: "POST",
    body: { entity, type: "questions", genres: ids } as Record<string, unknown>,
    credentials: "include",
  })
/** Set tones on question — POST /api/v0/entity/tones */
export const setEntityTones = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/tones", {
    method: "POST",
    body: { entity, type: "questions", tones: ids } as Record<string, unknown>,
    credentials: "include",
  })

// --- Colors — SERVICES §7 ---
export type ColorItem = { _id?: string; name?: string; colorCode?: string; [key: string]: unknown }
export type ColorsListResponse = { colors?: ColorItem[]; colorList?: ColorItem[] }

/** Full URL for colors — GET /api/v0/colors */
export function getColorsUrl(): string {
  return `${DASHBOARD_BASE_URL}/api/v0/colors`
}

// --- Upload intro/outro/share image — SERVICES §11 ---
/** POST /api/v0/external/uploadIntro — FormData with 'file'. Returns { location } */
export async function uploadIntroOutroOrImage(file: File): Promise<{ location: string }> {
  const url = `${DASHBOARD_BASE_URL}/api/v0/external/uploadIntro`
  const formData = new FormData()
  formData.append("file", file)
  const headers: Record<string, string> = { ...getAuthHeaders() }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  })
  if (!res.ok) {
    const errText = await res.text()
    let errMessage = errText
    try {
      const errJson = JSON.parse(errText)
      errMessage = (errJson as { message?: string }).message ?? errText
    } catch {
      // use errText
    }
    throw new Error(errMessage || `Upload failed: ${res.status}`)
  }
  return res.json() as Promise<{ location: string }>
}

// --- Answers (Clips) — SERVICES §4, ANSWER_LIST / ANSWER_DETAIL specs ---

export type ClipListParams = {
  from?: number
  limit?: number
  sort?: string
  qs?: string
  username?: string
  podcastSlug?: string
  tag?: string
  voiceArtistqs?: string
  fromDate?: string
  toDate?: string
  publisherSlug?: string
  showNonS3Clips?: boolean
  hidden?: boolean
  isIntroPresent?: boolean
  userFilter?: string
  question?: string
}

/** Build full URL for clips list — GET /api/v0/dashboard/dashboard-answers (SERVICES §4) */
export function getDashboardAnswersListUrl(params: ClipListParams): string {
  const search = new URLSearchParams()
  if (params.from != null) search.set("from", String(params.from))
  if (params.limit != null) search.set("limit", String(params.limit))
  if (params.sort) search.set("sort", params.sort)
  if (params.qs) search.set("qs", params.qs)
  if (params.username) search.set("username", params.username)
  if (params.podcastSlug) search.set("podcastSlug", params.podcastSlug)
  if (params.tag) search.set("tag", params.tag)
  if (params.voiceArtistqs) search.set("artistName", params.voiceArtistqs)
  if (params.fromDate) search.set("fromDate", params.fromDate)
  if (params.toDate) search.set("toDate", params.toDate)
  if (params.publisherSlug) search.set("publisherSlug", params.publisherSlug)
  if (params.showNonS3Clips === true) search.set("showNonS3Clips", "true")
  if (params.hidden === false) search.set("hidden", "false")
  if (params.hidden === true) search.set("hidden", "true")
  if (params.isIntroPresent === true) search.set("isIntroPresent", "true")
  if (params.userFilter === "verified") search.set("verifiedUser", "true")
  if (params.question) search.set("question", params.question)
  return `${DASHBOARD_BASE_URL}/api/v0/dashboard/dashboard-answers?${search.toString()}`
}

export type AnswerListResponse = {
  data?: { answers?: AnswerListItem[]; totalAnswers?: number }
  answers?: AnswerListItem[]
  totalAnswers?: number
}

export type AnswerListItem = {
  _id: string
  title?: string
  href?: string
  creationDate?: string | number
  starred?: boolean
  creator?: { uid?: string; name?: string }
  question?: { title?: string; hidden?: string }
  customAttributes?: {
    podcast?: { s3audioUrl?: string; podcast_name?: string; startTime?: number; endTime?: number }
    podcastIntro?: { isCustom?: boolean }
    aiIntro?: boolean
    voicedarticle?: { type?: string }
    bookChapter?: { type?: string }
    vanillaAudio?: { type?: string }
    vanillaVideo?: { type?: string }
    voiceHark?: unknown
  }
  tags?: Array<{ _id: string; name?: string } | string>
  [key: string]: unknown
}

/** GET /api/v0/dashboard/answers/:id — single clip detail (SERVICES §4) */
export function getAnswerDetailUrl(id: string | undefined, refreshKey?: number): string {
  if (!id) return ""
  const base = `${DASHBOARD_BASE_URL}/api/v0/dashboard/answers/${id}`
  return refreshKey != null ? `${base}?_refresh=${refreshKey}` : base
}

export type AnswerDetailResponse = {
  _id: string
  title?: string
  description?: string
  subText?: string
  creationDate?: string | number
  href?: string
  tags?: Array<{ _id: string; name?: string } | string>
  genres?: Array<{ _id: string; name?: string } | string>
  tones?: Array<{ _id: string; name?: string } | string>
  creator?: { _id?: string; uid?: string; name?: string }
  question?: { _id?: string; title?: string }
  metaTag?: { title?: string; description?: string }
  clipLink?: { title?: string; url?: string }
  foundBy?: Array<{ _id?: string; name?: string }>
  customAttributes?: {
    podcast?: {
      s3audioUrl?: string
      podcast_name?: string
      startTime?: number
      endTime?: number
      contentURI?: string
    }
    podcastIntro?: { contentURI?: string; isCustom?: boolean }
    aiIntro?: string
    forYouIntro?: string
    altPodcastIntro?: unknown
  }
  isCustomImagePath?: boolean
  customImagePath?: string
  voiceHarkClip?: boolean
  [key: string]: unknown
}

/** POST /api/v1/answers/:id — edit clip (SERVICES §4, ANSWER_DETAIL save) */
export type EditAnswerPayload = {
  title?: string
  questionId?: string
  description?: string
  forYouIntroDescription?: string
  aiIntro?: string
  podcastLink?: string
  rawText?: string
  subText?: string
  updateTime?: number
  podcastIntro?: Record<string, unknown> | null
  podcast?: { startTime?: number; endTime?: number }
  isNewStartEndTime?: boolean
  isCustomImagePath?: boolean
  customImagePath?: string
}

export const updateAnswer = (id: string | number, body: EditAnswerPayload) =>
  fetchAPI<unknown>(`/api/v1/answers/${id}`, {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

/** DELETE /api/v0/answers/:id (SERVICES §4) */
export const deleteAnswer = (id: string | number) =>
  fetchAPI<unknown>(`/api/v0/answers/${id}`, {
    method: "DELETE",
    credentials: "include",
  })

/** Set tags on answer — POST /api/v0/entity/tags (SERVICES §6, type 'answers') */
export const setAnswerTags = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/tags", {
    method: "POST",
    body: { entity, type: "answers", tags: ids } as Record<string, unknown>,
    credentials: "include",
  })
/** Set genres on answer */
export const setAnswerGenres = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/genres", {
    method: "POST",
    body: { entity, type: "answers", genres: ids } as Record<string, unknown>,
    credentials: "include",
  })
/** Set tones on answer */
export const setAnswerTones = (entity: string | number, ids: string[]) =>
  fetchAPI<unknown>("/api/v0/entity/tones", {
    method: "POST",
    body: { entity, type: "answers", tones: ids } as Record<string, unknown>,
    credentials: "include",
  })

/** GET api/v0/answers/:id/socialtext — quote, revelation, socialCopy (ANSWER_DETAIL) */
export function getAnswerSocialTextUrl(id: string | undefined): string {
  if (!id) return ""
  return `${DASHBOARD_BASE_URL}/api/v0/answers/${id}/socialtext`
}

/** POST api/v0/answers/:id/socialtext */
export const saveAnswerSocialText = (id: string | number, body: { quote?: string; revelation?: string; socialCopy?: string }) =>
  fetchAPI<unknown>(`/api/v0/answers/${id}/socialtext`, {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

/** POST /api/v0/dashboard/answer/metaTags (ANSWER_DETAIL) */
export const saveAnswerMetaTags = (payload: { id: string | number; title?: string; description?: string }) =>
  fetchAPI<unknown>("/api/v0/dashboard/answer/metaTags", {
    method: "POST",
    body: payload as Record<string, unknown>,
    credentials: "include",
  })

/** POST /api/v0/dashboard/answer/cliplink */
export const updateAnswerClipLink = (payload: { title?: string; url?: string; id?: string }) =>
  fetchAPI<unknown>("/api/v0/dashboard/answer/cliplink", {
    method: "POST",
    body: payload as Record<string, unknown>,
    credentials: "include",
  })

/** GET /api/v0/answers/getHarkVoiceCategories — Daily Clips categories (ANSWER_LIST) */
export function getHarkVoiceCategoriesUrl(): string {
  return `${DASHBOARD_BASE_URL}/api/v0/answers/getHarkVoiceCategories`
}

/** POST /api/v0/voicehark/clip/:id — add/remove Daily Clips (ANSWER_LIST) */
export const updateVoiceHarkClip = (id: string | number, body: { voiceHark: boolean; harkVoiceCategory?: string | null }) =>
  fetchAPI<unknown>(`/api/v0/voicehark/clip/${id}`, {
    method: "POST",
    body: body as Record<string, unknown>,
    credentials: "include",
  })

/** GET /api/v0/dashboard/search-podcast?q=&from=&limit= (ANSWER_LIST supporting) */
export function getSearchPodcastUrl(q: string, from = 0, limit = 20): string {
  const params = new URLSearchParams({ q: q || "", from: String(from), limit: String(limit) })
  return `${DASHBOARD_BASE_URL}/api/v0/dashboard/search-podcast?${params.toString()}`
}

/** GET /api/v0/podcasts/artists?qs=&from=&limit= (ANSWER_LIST Network filter) */
export function getSearchVoiceArtistsUrl(qs: string, from = 0, limit = 20): string {
  const params = new URLSearchParams({ qs: qs || "", from: String(from), limit: String(limit) })
  return `${DASHBOARD_BASE_URL}/api/v0/podcasts/artists?${params.toString()}`
}

/** GET /api/v0/dashboard/dashboard-members/?qs=&limit= (ANSWER_LIST user name) */
export function getDashboardMembersUrl(qs: string, limit = 50): string {
  const params = new URLSearchParams({ qs: qs || "", limit: String(limit) })
  return `${DASHBOARD_BASE_URL}/api/v0/dashboard/dashboard-members/?${params.toString()}`
}

// --- Curation Groups (CURATION_GROUPS_SPEC) ---
export type CurationGroupItem = { _id: string; name: string; [key: string]: unknown }

/** GET /api/v0/dashboard/curationGroups/all */
export function getCurationGroupsAllUrl(qs?: string): string {
  const params = qs ? `?qs=${encodeURIComponent(qs)}` : ""
  return `${DASHBOARD_BASE_URL}/api/v0/dashboard/curationGroups/all${params}`
}

export const fetchAllCurationGroups = (options?: { qs?: string }): Promise<CurationGroupItem[]> =>
  fetchAPI<CurationGroupItem[] | { data?: CurationGroupItem[] }>(
    `/api/v0/dashboard/curationGroups/all${options?.qs ? `?qs=${encodeURIComponent(options.qs)}` : ""}`
  ).then((r) => (Array.isArray(r) ? r : (r as { data?: CurationGroupItem[] })?.data ?? []))

export const addCurationGroup = (curationGroupName: string) =>
  fetchAPI<unknown>("/api/v0/dashboard/curationGroups/create", {
    method: "POST",
    body: { curationGroupName },
    credentials: "include",
  })

export const editCurationGroup = (id: string, curationGroupName: string) =>
  fetchAPI<unknown>("/api/v0/dashboard/curationGroups/edit", {
    method: "POST",
    body: { id, curationGroupName },
    credentials: "include",
  })

export const deleteCurationGroup = (curationGroupId: string) =>
  fetchAPI<unknown>("/api/v0/dashboard/curationGroups/delete", {
    method: "DELETE",
    body: { curationGroupId },
    credentials: "include",
  })

export const attachCurationGroupsToPodcast = (payload: { podcastId: string; curationGroupIds: string[] }) =>
  fetchAPI<unknown>("/api/v0/dashboard/podcast/assign-curation-group", {
    method: "POST",
    body: payload,
    credentials: "include",
  })

// --- Transcript / Tracked Podcasts (TRACKED_PODCASTS_SPEC) ---
export type TrackedPodcastItem = {
  _id: string
  title?: string
  aiClipSuggestionCategory?: string
  curationGroups?: Array<{ _id: string; name: string } | string>
  [key: string]: unknown
}

/** GET /api/v0/transcript/podcast/list */
export function getPodcastTranscriptListUrl(curationGroupId?: string): string {
  const params = new URLSearchParams()
  if (curationGroupId) params.set("curationGroupId", curationGroupId)
  return `${DASHBOARD_BASE_URL}/api/v0/transcript/podcast/list?${params.toString()}`
}

export const getPodcastTranscript = (params?: { curationGroupId?: string }) =>
  fetchAPI<{ transcriptList?: TrackedPodcastItem[] }>(
    `/api/v0/transcript/podcast/list${params?.curationGroupId ? `?curationGroupId=${encodeURIComponent(params.curationGroupId)}` : ""}`
  ).then((r) => ({
    transcriptList: Array.isArray((r as { transcriptList?: TrackedPodcastItem[] }) ?? [])
      ? (r as { transcriptList: TrackedPodcastItem[] }) ?? []
      : [] as TrackedPodcastItem[],
  }))

export const addPodcastTranscript = (payload: {
  podcastId?: string
  podcastSlug?: string
  podcastType?: "internal" | "external"
  aiClipSuggestionCategory?: string
}) =>
  fetchAPI<unknown>("/api/v0/transcript/podcast", {
    method: "POST",
    body: payload,
    credentials: "include",
  })

export const deletePodcastTranscript = (podcastId: string) =>
  fetchAPI<unknown>("/api/v0/transcript/podcast", {
    method: "DELETE",
    body: { podcastId },
    credentials: "include",
  })

export const editPodcastTranscriptPromptCategory = (podcastId: string, aiClipSuggestionCategory: string) =>
  fetchAPI<unknown>("/api/v0/dashboard/aiClipSuggestionCategories/edit", {
    method: "POST",
    body: { podcastId, aiClipSuggestionCategory },
    credentials: "include",
  })

/** GET /api/v0/dashboard/clip/suggestion/aiClipSuggestionCategories */
export const getCategoryClipSuggestionsData = () =>
  fetchAPI<Array<{ _id: string; name: string; [key: string]: unknown }>>(
    "/api/v0/dashboard/clip/suggestion/aiClipSuggestionCategories"
  ).then((r) => (Array.isArray(r) ? r : []))

// --- Episode Detail (EPISODE_DETAIL_COMPONENT_SPEC) ---
/** GET /api/v0/podcasts/:id — podcast metadata including href for RSS */
export type PodcastDetailResponse = { _id?: string; href?: string; title?: string; [key: string]: unknown }
export const fetchPodcastDetail = (id: string) =>
  fetchAPI<PodcastDetailResponse>(`/api/v0/podcasts/${encodeURIComponent(id)}`)

/** GET /api/v0/external/parse-podcast-rss?url= — parse RSS and return episodes */
export type EpisodeDetailItem = {
  _id?: string
  name?: string
  title?: string
  description?: string
  artistName?: string
  podcastSlug?: string
  episodeSlug?: string
  s3audioUrl?: string
  createdAt?: string | number
  pubDate?: string | number
  [key: string]: unknown
}
export type PodcastEpisodesResponse = { title?: string; podcasts?: EpisodeDetailItem[] }
export const getPodcastEpisodesFromRss = (href: string) =>
  fetchAPI<PodcastEpisodesResponse>(
    `/api/v0/external/parse-podcast-rss?url=${encodeURIComponent(href)}`
  ).then((r) => {
    const data = r as { data?: PodcastEpisodesResponse } & PodcastEpisodesResponse
    const payload = data?.data ?? data
    return {
      title: payload?.title ?? "",
      podcasts: Array.isArray(payload?.podcasts) ? payload.podcasts : [],
    }
  })

/** POST /api/v0/external/uploadMultipleEpisodeManually — download episodes to S3 */
export const downloadEpisodesToS3 = (payload: { ids?: EpisodeDetailItem[] }) =>
  fetchAPI<unknown>("/api/v0/external/uploadMultipleEpisodeManually", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
    credentials: "include",
  })

// --- Episode Feed SXM (EPISODE_FEED_SXM_SPEC) ---
export type SxmEpisodeItem = {
  podcastSlug?: string
  episodeSlug?: string
  name?: string
  description?: string
  podcast_name?: string
  duration?: number
  generateTranscriptStatus?: string
  pubDate?: string | number
  creationDate?: string | number
  [key: string]: unknown
}

/** GET /api/v0/sxm/latestEpisode */
export function getSxmLatestEpisodeUrl(options: {
  qs?: string
  podcastqs?: string
  daysOffset?: number
  offset?: number
  curationGroupId?: string
}): string {
  const params = new URLSearchParams()
  if (options.qs) params.set("qs", options.qs)
  if (options.podcastqs) params.set("podcastqs", options.podcastqs)
  if (options.curationGroupId) params.set("curationGroupId", options.curationGroupId)
  const offset = options.daysOffset ?? options.offset
  if (offset != null) params.set("daysOffset", String(offset))
  if (offset != null) params.set("offset", String(offset))
  return `${DASHBOARD_BASE_URL}/api/v0/sxm/latestEpisode?${params.toString()}`
}

export const getSxmLatestPodcast = (options: Parameters<typeof getSxmLatestEpisodeUrl>[0]) => {
  const path = getSxmLatestEpisodeUrl(options).replace(DASHBOARD_BASE_URL, "")
  return fetchAPI<{ episodes?: SxmEpisodeItem[]; dateInfo?: { nextOffset?: number; hasMore?: boolean }; data?: { episodes?: SxmEpisodeItem[]; dateInfo?: { nextOffset?: number; hasMore?: boolean } } }>(path).then((res) => {
    const data = (res as { data?: unknown })?.data ?? res
    const episodes = (data as { episodes?: SxmEpisodeItem[] }).episodes ?? []
    const dateInfo = (data as { dateInfo?: { nextOffset?: number; hasMore?: boolean } }).dateInfo
    return {
      episodes: Array.isArray(episodes) ? episodes : [],
      nextOffset: dateInfo?.nextOffset,
      hasMore: dateInfo?.hasMore ?? false,
    }
  })
}

/** POST /api/v0/sxm/episodeDetails */
export const getSxmEpisodeDetails = (podcastSlug: string, episodeSlug: string) =>
  fetchAPI<unknown>("/api/v0/sxm/episodeDetails", {
    method: "POST",
    body: { podcastSlug, episodeSlug },
    credentials: "include",
  })

// --- On Demand Episodes (ON_DEMAND_EPISODES_SPEC) ---
export type OnDemandEpisodeItem = {
  _id: string
  name?: string
  description?: string
  podcast_name?: string
  duration?: number
  image?: string
  transcriptRequestDateTime?: string | number
  transcriptRequestedBy?: string
  generateTranscriptStatus?: string
  podcastSlug?: string
  episodeSlug?: string
  [key: string]: unknown
}

/** GET /api/v0/transcript/episode/list */
export function getEpisodeTranscriptListUrl(params: {
  page: number
  limit: number
  qs?: string
  podcastqs?: string
  userNameqs?: string
}): string {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })
  if (params.qs) search.set("qs", params.qs)
  if (params.podcastqs) search.set("podcastqs", params.podcastqs)
  if (params.userNameqs) search.set("userNameqs", params.userNameqs)
  return `${DASHBOARD_BASE_URL}/api/v0/transcript/episode/list?${search.toString()}`
}

export type EpisodeTranscriptListResponse = {
  data?: { data?: OnDemandEpisodeItem[]; pagination?: { total?: number; totalPages?: number } }
}

export const getEpisodeTranscriptList = (page: number, limit: number, options?: { qs?: string; podcastqs?: string; userNameqs?: string }) => {
  const path = getEpisodeTranscriptListUrl({ page, limit, ...options }).replace(DASHBOARD_BASE_URL, "")
  return fetchAPI<EpisodeTranscriptListResponse>(path).then((r) => {
    const data = (r as EpisodeTranscriptListResponse).data
    const list = data ?? []
    const pagination = data?.pagination ?? {}
    return {
      episodeList: Array.isArray(list) ? list : [],
      totalItems: pagination.total ?? 0,
      totalPages: pagination.totalPages ?? 1,
    }
  })
}

/** POST /api/v0/transcript/episode — request transcript */
export const requestEpisodeTranscript = (episode: Record<string, unknown>, regenerateTranscript?: boolean) =>
  fetchAPI<unknown>("/api/v0/transcript/episode", {
    method: "POST",
    body: { episode, regenerateTranscript },
    credentials: "include",
  })

/** DELETE /api/v0/transcript/episode */
export const deleteEpisodeTranscript = (id: string) =>
  fetchAPI<unknown>("/api/v0/transcript/episode", {
    method: "DELETE",
    body: { _id: id },
    credentials: "include",
  })