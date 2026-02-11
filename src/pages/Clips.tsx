import { useState, useMemo, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  getDashboardAnswersListUrl,
  getSearchPodcastUrl,
  getSearchVoiceArtistsUrl,
  getDashboardMembersUrl,
  type AnswerListResponse,
  type AnswerListItem,
} from "@/lib/api"
import { WEB_URL } from "@/config/constant"
import useFetch from "@/customHook/useFetch"
import useDebounce from "@/customHook/useDebounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { TablePagination } from "@/components/TablePagination"
import { LoadingState } from "@/components/LoadingState"
import { ErrorState } from "@/components/ErrorState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 500

const SORT_OPTIONS = [
  { value: "newest", label: "Recent" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "popular_desc", label: "Popular" },
  { value: "popular_asc", label: "Popular (asc)" },
  { value: "agreed_count_desc", label: "Agreed" },
  { value: "agreed_count_asc", label: "Agreed (asc)" },
] as const

/** ISO date string for API fromDate/toDate */
function toISODate(value: string): string {
  if (!value.trim()) return ""
  const d = new Date(value.trim())
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

/** Detail route (ANSWER_LIST: by clip type; we use one route, detail page handles type) */
function getClipDetailPath(answer: AnswerListItem): string {
  return `/dashboard/clips/${answer._id}`
}

/** Intro display: Yes / No / U (undefined); bold if custom (ANSWER_LIST table) */
function IntroCell({ answer }: { answer: AnswerListItem }) {
  const intro = answer.customAttributes?.podcastIntro
  if (intro == null) return <span className="text-gray-600">U</span>
  const hasIntro = !!intro && (typeof intro === "object" ? "contentURI" in intro || "isCustom" in intro : true)
  const label = hasIntro ? "Yes" : "No"
  const isCustom = typeof intro === "object" && (intro as { isCustom?: boolean }).isCustom
  return (
    <span className={isCustom ? "font-semibold text-gray-900" : "text-gray-600"}>
      {label}
    </span>
  )
}

const defaultFilters = {
  sort: "newest" as const,
  qs: "",
  username: "",
  podcastSlug: "",
  tag: "",
  voiceArtistqs: "",
  fromDate: "",
  toDate: "",
  publisherSlug: "",
  showNonS3Clips: false,
  visibleOnly: false,
  isIntroPresent: false,
  verifiedOnly: false,
}

export function Clips() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<string>(defaultFilters.sort)
  const [username, setUsername] = useState("")
  const [usernameQuery, setUsernameQuery] = useState("")
  const [podcastSlug, setPodcastSlug] = useState("")
  const [podcastDisplay, setPodcastDisplay] = useState("")
  const [podcastQuery, setPodcastQuery] = useState("")
  const [tag, setTag] = useState("")
  const [networkQuery, setNetworkQuery] = useState("")
  const [voiceArtistqs, setVoiceArtistqs] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [publisherSlug, setPublisherSlug] = useState("")
  const [showNonS3Clips, setShowNonS3Clips] = useState(false)
  const [visibleOnly, setVisibleOnly] = useState(false)
  const [isIntroPresent, setIsIntroPresent] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [podcastDropdownOpen, setPodcastDropdownOpen] = useState(false)
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const podcastDropdownRef = useRef<HTMLDivElement>(null)
  const networkDropdownRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(searchQuery.trim(), SEARCH_DEBOUNCE_MS)
  const debouncedUsername = useDebounce(usernameQuery.trim(), 300)
  const debouncedPodcast = useDebounce(podcastQuery.trim(), 300)
  const debouncedNetwork = useDebounce(networkQuery.trim(), 300)

  const membersUrl = getDashboardMembersUrl(debouncedUsername, 50)
  const podcastSearchUrl = debouncedPodcast ? getSearchPodcastUrl(debouncedPodcast, 0, 20) : ""
  const networkSearchUrl = debouncedNetwork ? getSearchVoiceArtistsUrl(debouncedNetwork, 0, 20) : ""

  const { data: membersData } = useFetch(membersUrl, { credentials: "include" })
  const { data: podcastSearchData } = useFetch(podcastSearchUrl, { credentials: "include" })
  const { data: networkSearchData } = useFetch(networkSearchUrl, { credentials: "include" })

  const membersList: Array<{ _id: string; name?: string }> = useMemo(() => {
    const m = membersData as { members?: { list?: Array<{ _id: string; name?: string }> }; list?: Array<{ _id: string; name?: string }> } | null
    return m?.members?.list ?? m?.list ?? []
  }, [membersData])
  const podcastList: Array<{ podcastSlug?: string; title?: string }> = useMemo(() => {
    const p = podcastSearchData as { podcastList?: Array<{ podcastSlug?: string; title?: string }>; data?: unknown[] } | null
    if (Array.isArray(p?.podcastList)) return p.podcastList
    if (Array.isArray(p)) return p
    return []
  }, [podcastSearchData])
  const networkList: Array<string | { name?: string; artistName?: string }> = useMemo(() => {
    const n = networkSearchData as { voiceArtistList?: unknown[]; list?: unknown[] } | null
    const arr = n?.voiceArtistList ?? n?.list ?? []
    return (Array.isArray(arr) ? arr : []) as Array<string | { name?: string; artistName?: string }>
  }, [networkSearchData])

  const fromDateISO = toISODate(fromDate)
  const toDateISO = toISODate(toDate)

  const hasActiveFilters =
    debouncedSearch ||
    username ||
    podcastSlug ||
    tag.trim() ||
    voiceArtistqs ||
    fromDateISO ||
    toDateISO ||
    publisherSlug ||
    showNonS3Clips ||
    visibleOnly ||
    isIntroPresent ||
    verifiedOnly

  const clearAllFilters = () => {
    setSearchQuery(defaultFilters.qs)
    setUsername("")
    setUsernameQuery("")
    setPodcastSlug("")
    setPodcastDisplay("")
    setPodcastQuery("")
    setTag(defaultFilters.tag)
    setVoiceArtistqs("")
    setNetworkQuery("")
    setFromDate(defaultFilters.fromDate)
    setToDate(defaultFilters.toDate)
    setPublisherSlug(defaultFilters.publisherSlug)
    setSort(defaultFilters.sort)
    setShowNonS3Clips(defaultFilters.showNonS3Clips)
    setVisibleOnly(defaultFilters.visibleOnly)
    setIsIntroPresent(defaultFilters.isIntroPresent)
    setVerifiedOnly(defaultFilters.verifiedOnly)
    setCurrentPage(1)
    setUserDropdownOpen(false)
    setPodcastDropdownOpen(false)
    setNetworkDropdownOpen(false)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [
    debouncedSearch,
    sort,
    username,
    podcastSlug,
    tag,
    voiceArtistqs,
    fromDateISO,
    toDateISO,
    publisherSlug,
    showNonS3Clips,
    visibleOnly,
    isIntroPresent,
    verifiedOnly,
  ])

  const listUrl = useMemo(
    () =>
      getDashboardAnswersListUrl({
        from: (currentPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort,
        qs: debouncedSearch || undefined,
        username: username || undefined,
        podcastSlug: podcastSlug || undefined,
        tag: tag.trim() || undefined,
        voiceArtistqs: voiceArtistqs || undefined,
        fromDate: fromDateISO || undefined,
        toDate: toDateISO || undefined,
        publisherSlug: publisherSlug || undefined,
        showNonS3Clips: showNonS3Clips || undefined,
        hidden: visibleOnly ? false : undefined,
        isIntroPresent: isIntroPresent || undefined,
        userFilter: verifiedOnly ? "verified" : undefined,
      }),
    [
      currentPage,
      debouncedSearch,
      sort,
      username,
      podcastSlug,
      tag,
      voiceArtistqs,
      fromDateISO,
      toDateISO,
      publisherSlug,
      showNonS3Clips,
      visibleOnly,
      isIntroPresent,
      verifiedOnly,
    ]
  )

  const { data, loading, error } = useFetch(listUrl, { credentials: "include" })

  const { answers, totalAnswers, totalPages, startIndex, endIndex } = useMemo(() => {
    const res = data as AnswerListResponse | null
    const raw = res?.data ?? res
    const list: AnswerListItem[] = raw?.answers ?? []
    const total = raw?.totalAnswers ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const start = (currentPage - 1) * PAGE_SIZE
    const startIndex = total === 0 ? 0 : start + 1
    const endIndex = Math.min(start + list.length, total)
    return {
      answers: list,
      totalAnswers: total,
      totalPages,
      startIndex,
      endIndex,
    }
  }, [data, currentPage])

  if (loading) {
    return <LoadingState message="Loading clips…" />
  }

  if (error) {
    return <ErrorState message={`Error: ${String(error)}`} />
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters} className="text-primary hover:underline">
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Search text</Label>
              <Input
                type="search"
                placeholder="Enter search text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm flex-1"
                aria-label="Search clips"
              />
            </div>
            <div className="space-y-1 relative" ref={userDropdownRef}>
              <Label className="text-xs text-gray-600">User name</Label>
              <Input
                placeholder="Enter user name"
                value={username || usernameQuery}
                onChange={(e) => {
                  setUsernameQuery(e.target.value)
                  if (!e.target.value) setUsername("")
                  setUserDropdownOpen(!!e.target.value.trim())
                }}
                onFocus={() => debouncedUsername && setUserDropdownOpen(true)}
                className="max-w-sm"
              />
              {userDropdownOpen && membersList.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-sm rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto">
                  {membersList.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setUsername(member.name ?? member._id)
                        setUsernameQuery("")
                        setUserDropdownOpen(false)
                      }}
                    >
                      {member.name ?? member._id}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1 relative" ref={podcastDropdownRef}>
              <Label className="text-xs text-gray-600">Podcast</Label>
              <Input
                placeholder="Enter Podcast"
                value={podcastSlug ? podcastDisplay : podcastQuery}
                onChange={(e) => {
                  setPodcastQuery(e.target.value)
                  if (!e.target.value) {
                    setPodcastSlug("")
                    setPodcastDisplay("")
                  }
                  setPodcastDropdownOpen(!!e.target.value.trim())
                }}
                onFocus={() => debouncedPodcast && setPodcastDropdownOpen(true)}
                className="max-w-sm"
              />
              {podcastDropdownOpen && podcastList.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-sm rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto">
                  {podcastList.map((item, i) => (
                    <button
                      key={item.podcastSlug ?? i}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setPodcastSlug(item.podcastSlug ?? "")
                        setPodcastDisplay(item.title ?? item.podcastSlug ?? "")
                        setPodcastQuery("")
                        setPodcastDropdownOpen(false)
                      }}
                    >
                      {item.title ?? item.podcastSlug ?? ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Tag search</Label>
              <Input
                placeholder="Enter Search Tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="space-y-1 relative" ref={networkDropdownRef}>
              <Label className="text-xs text-gray-600">Network</Label>
              <Input
                placeholder="Network"
                value={voiceArtistqs || networkQuery}
                onChange={(e) => {
                  setNetworkQuery(e.target.value)
                  if (!e.target.value) setVoiceArtistqs("")
                  setNetworkDropdownOpen(!!e.target.value.trim())
                }}
                onFocus={() => debouncedNetwork && setNetworkDropdownOpen(true)}
                className="max-w-sm"
              />
              {networkDropdownOpen && networkList.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-sm rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto">
                  {networkList.map((item, i) => {
                    const label = typeof item === "string" ? item : item?.name ?? item?.artistName ?? ""
                    return (
                      <button
                        key={i}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => {
                          setVoiceArtistqs(label)
                          setNetworkQuery("")
                          setNetworkDropdownOpen(false)
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Sort</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full max-w-[140px]" aria-label="Sort by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">From date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="max-w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">To date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="max-w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Publisher</Label>
              <Input
                placeholder="Select Publisher"
                value={publisherSlug}
                onChange={(e) => setPublisherSlug(e.target.value)}
                className="max-w-[180px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNonS3Clips}
                  onChange={(e) => setShowNonS3Clips(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show Non S3 Clips</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleOnly}
                  onChange={(e) => setVisibleOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show visible clips</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isIntroPresent}
                  onChange={(e) => setIsIntroPresent(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Show clips with intros</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Verified user</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    View on Web
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Intro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    AI Intro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Hidden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Podcast
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Harklist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {answers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      No clips found
                    </td>
                  </tr>
                ) : (
                  answers.map((answer) => (
                    <tr key={answer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1">
                          {answer.customAttributes?.podcast?.s3audioUrl && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                              S3
                            </span>
                          )}
                          {answer.starred && (
                            <span className="text-amber-500" aria-hidden>★</span>
                          )}
                          <Link
                            to={getClipDetailPath(answer)}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {answer.title ?? answer._id}
                          </Link>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.href ? (
                          <a
                            href={`${WEB_URL}/${answer.href}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <IntroCell answer={answer} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.customAttributes?.aiIntro ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.question?.hidden === "true" ? "Yes" : answer.question?.hidden === "false" ? "No" : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.creator?.uid ? (
                          <Link
                            to={`/dashboard/users/${answer.creator.uid}`}
                            className="text-primary hover:underline"
                          >
                            {answer.creator.name ?? answer.creator.uid}
                          </Link>
                        ) : (
                          answer.creator?.name ?? "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.customAttributes?.podcast?.podcast_name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {answer.question?.title ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(answer.creationDate)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="flex flex-wrap gap-1">
                          {(answer.tags ?? []).slice(0, 3).map((t) => {
                            const id = typeof t === "string" ? t : t._id
                            const name = typeof t === "string" ? t : t.name
                            return (
                              <Link
                                key={id}
                                to={`/dashboard/tags/${id}`}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
                              >
                                {name ?? id}
                              </Link>
                            )
                          })}
                          {(answer.tags?.length ?? 0) > 3 && (
                            <span className="text-gray-500 text-xs">+{(answer.tags?.length ?? 0) - 3}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{answer._id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          total={totalAnswers}
          itemLabel="clips"
        />
      </div>
    </div>
  )
}
