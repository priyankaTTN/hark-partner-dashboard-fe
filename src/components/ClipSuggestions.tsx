import * as React from "react"
import { useMemo, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router"
import { API_URL, BASE_URL } from "@/config/constant"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import useDebounce from "@/customHook/useDebounce"
import useFetch from "@/customHook/useFetch"
interface Clip {
  title: string
  quotes: string
  fullQuote: string
  category: string
  description: string
  episode_title: string
  podcastName: string
  pubDate: string | number
  podcastSlug: string
  episodeSlug: string
  startTime: number
  endTime: number
  audioUrl: string
}

interface CurationGroup {
  _id: string
  name: string
}

// Date range presets configuration
const DATE_RANGE_PRESETS = {
  today: {
    label: "Today",
    getDates: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)
      return { fromDate: today, toDate: endOfDay }
    }
  },
  last7days: {
    label: "Last 3 Days",
    getDates: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 2)
      threeDaysAgo.setHours(0, 0, 0, 0)
      return { fromDate: threeDaysAgo, toDate: today }
    }
  },
  past3days: {
    label: "Past 3 Days",
    getDates: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 2)
      threeDaysAgo.setHours(0, 0, 0, 0)
      return { fromDate: threeDaysAgo, toDate: today }
    }
  },
  last30days: {
    label: "Last 30 Days",
    getDates: () => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      return { fromDate: thirtyDaysAgo, toDate: today }
    }
  },
 
}

export function ClipSuggestions() {
  // Initialize default 3 days date range
  const getDefault3DaysRange = () => {
    const presetConfig = DATE_RANGE_PRESETS.last7days
    const { fromDate: from, toDate: to } = presetConfig.getDates()
    // Format date to YYYY-MM-DD (for input type="date")
    const formatDateOnly = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    return {
      fromDateStr: formatDateOnly(from),
      toDateStr: formatDateOnly(to),
      fromTimestamp: from.getTime(),
      toTimestamp: to.getTime(),
    }
  }
  
  const defaultDates = getDefault3DaysRange()
  
  // Utility function to convert date string to timestamp (milliseconds)
  const dateToTimestamp = (dateString: string): number => {
    if (!dateString) return 0
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }

  // Utility function to convert date string to end of day timestamp
  const dateToEndOfDayTimestamp = (dateString: string): number => {
    if (!dateString) return 0
    const date = new Date(dateString)
    date.setHours(23, 59, 59, 999)
    return date.getTime()
  }

  // Use React Router's useSearchParams
  const [searchParams, setSearchParams] = useSearchParams()

  // Helper function to get URL params - using correct parameter names
  const getUrlParams = useCallback(() => {
    return {
      search: searchParams.get("keywords") || "",
      notableQuotes: searchParams.get("notableQuotes") || "",
      podcast: searchParams.get("podcast") || "",
      episode: searchParams.get("episode") || "",
      dateRange: searchParams.get("dateRange") || "last7days",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      groupByPodcast: searchParams.get("groupByPodcast") === "true",
      groupByTopic: searchParams.get("groupByTopic") === "true",
      curationGroup: searchParams.get("curationGroupId") || "",
    }
  }, [searchParams])

  // Use a ref to track if we're updating from internal state changes
  const isInternalUpdate = React.useRef(false)

  // Helper function to update URL params - prevent duplicate updates
  const updateUrlParams = useCallback((updates: Partial<{
    keywords: string
    notableQuotes: string
    podcast: string
    episode: string
    dateRange: string
    from: string
    to: string
    groupByPodcast: boolean
    groupByTopic: boolean
    curationGroupId: string
  }>) => {
    isInternalUpdate.current = true
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams)
      let hasChanges = false
      
      // Always remove old "curationGroup" parameter if it exists
      if (newParams.has("curationGroup")) {
        newParams.delete("curationGroup")
        hasChanges = true
      }
      
      // Remove other deprecated parameters
      const deprecatedParams = ["search", "datePreset", "fromDate", "toDate"]
      deprecatedParams.forEach(param => {
        if (newParams.has(param)) {
          newParams.delete(param)
          hasChanges = true
        }
      })
      
      // Map internal names to URL parameter names
      const paramMap: Record<string, string> = {
        keywords: "keywords",
        notableQuotes: "notableQuotes",
        podcast: "podcast",
        episode: "episode",
        dateRange: "dateRange",
        from: "from",
        to: "to",
        groupByPodcast: "groupByPodcast",
        groupByTopic: "groupByTopic",
        curationGroupId: "curationGroupId",
      }
      
      // Update or remove params
      Object.entries(updates).forEach(([key, value]) => {
        const urlKey = paramMap[key as keyof typeof paramMap] || key
        const currentValue = newParams.get(urlKey)
        const newValue = value === "" || value === false || value === null || value === undefined 
          ? null 
          : String(value)
        
        if (newValue === null) {
          if (currentValue !== null) {
            newParams.delete(urlKey)
            hasChanges = true
          }
        } else {
          if (currentValue !== newValue) {
            newParams.set(urlKey, newValue)
            hasChanges = true
          }
        }
      })

      // Only update if there are actual changes
      return hasChanges ? newParams : prevParams
    }, { replace: true })
  }, [setSearchParams])

  // Initialize state from URL params on mount
  const urlParams = getUrlParams()
  
  // Date range state - initialized from URL or default 3 days
  const getInitialDateState = useCallback(() => {
    if (urlParams.from && urlParams.to) {
      const fromTimestamp = dateToTimestamp(urlParams.from)
      const toTimestamp = dateToEndOfDayTimestamp(urlParams.to)
      return {
        preset: urlParams.dateRange || "custom",
        fromDate: urlParams.from,
        toDate: urlParams.to,
        appliedFromDate: fromTimestamp,
        appliedToDate: toTimestamp,
      }
    } else if (urlParams.dateRange && urlParams.dateRange !== "custom") {
      const presetConfig = DATE_RANGE_PRESETS[urlParams.dateRange as keyof typeof DATE_RANGE_PRESETS]
      if (presetConfig) {
        const { fromDate: from, toDate: to } = presetConfig.getDates()
        const formatDateOnly = (date: Date): string => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          return `${year}-${month}-${day}`
        }
        return {
          preset: urlParams.dateRange,
          fromDate: formatDateOnly(from),
          toDate: formatDateOnly(to),
          appliedFromDate: from.getTime(),
          appliedToDate: to.getTime(),
        }
      }
    }
    return {
      preset: "last7days",
      fromDate: defaultDates.fromDateStr,
      toDate: defaultDates.toDateStr,
      appliedFromDate: defaultDates.fromTimestamp,
      appliedToDate: defaultDates.toTimestamp,
    }
  }, [urlParams, defaultDates])

  const initialDateState = getInitialDateState()

  // Initialize state from URL params
  const [searchInput, setSearchInput] = React.useState(urlParams.search)
  const [notableQuotesInput, setNotableQuotesInput] = React.useState(urlParams.notableQuotes)
  const [podcastInput, setPodcastInput] = React.useState(urlParams.podcast)
  const [episodeInput, setEpisodeInput] = React.useState(urlParams.episode)
  const [groupByPodcast, setGroupByPodcast] = React.useState(urlParams.groupByPodcast)
  const [groupByTopic, setGroupByTopic] = React.useState(urlParams.groupByTopic)
  const [selectedCurationGroupId, setSelectedCurationGroupId] = React.useState(urlParams.curationGroup)
  
  const [selectedDateRangePreset, setSelectedDateRangePreset] = React.useState<string>(initialDateState.preset)
  const [fromDate, setFromDate] = React.useState<string>(initialDateState.fromDate)
  const [toDate, setToDate] = React.useState<string>(initialDateState.toDate)
  const [appliedFromDate, setAppliedFromDate] = React.useState<number | null>(initialDateState.appliedFromDate)
  const [appliedToDate, setAppliedToDate] = React.useState<number | null>(initialDateState.appliedToDate)

  // Clean up URL on mount - remove old parameters and ensure proper format
  useEffect(() => {
    const hasOldParams = searchParams.has("curationGroup") || 
                         searchParams.has("search") || 
                         searchParams.has("datePreset") ||
                         searchParams.has("fromDate") ||
                         searchParams.has("toDate")
    
    if (hasOldParams) {
      const newParams = new URLSearchParams()
      const validParams = [
        "keywords", "notableQuotes", "podcast", "episode", 
        "dateRange", "from", "to", 
        "groupByPodcast", "groupByTopic", "curationGroupId"
      ]
      
      // Migrate old params to new names
      if (searchParams.has("search")) {
        const searchValue = searchParams.get("search")
        if (searchValue) newParams.set("keywords", searchValue)
      }
      if (searchParams.has("datePreset")) {
        const datePreset = searchParams.get("datePreset")
        if (datePreset) newParams.set("dateRange", datePreset)
      }
      if (searchParams.has("fromDate")) {
        const fromDateValue = searchParams.get("fromDate")
        if (fromDateValue) newParams.set("from", fromDateValue)
      }
      if (searchParams.has("toDate")) {
        const toDateValue = searchParams.get("toDate")
        if (toDateValue) newParams.set("to", toDateValue)
      }
      
      // Copy other valid params
      searchParams.forEach((value, key) => {
        if (validParams.includes(key) && key !== "curationGroup") {
          newParams.set(key, value)
        }
      })
      
      // If curationGroupId exists, use it; otherwise try to migrate from curationGroup
      if (searchParams.has("curationGroupId")) {
        newParams.set("curationGroupId", searchParams.get("curationGroupId")!)
      }
      
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Sync state with URL params when they change (for browser back/forward)
  // This effect only runs when searchParams change externally (e.g., browser navigation)
  useEffect(() => {
    // Skip if this is an internal update (we're the ones changing the URL)
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    
    const currentParams = getUrlParams()
    
    // Only update if values actually changed to avoid unnecessary re-renders
    if (currentParams.search !== searchInput) setSearchInput(currentParams.search)
    if (currentParams.notableQuotes !== notableQuotesInput) setNotableQuotesInput(currentParams.notableQuotes)
    if (currentParams.podcast !== podcastInput) setPodcastInput(currentParams.podcast)
    if (currentParams.episode !== episodeInput) setEpisodeInput(currentParams.episode)
    if (currentParams.groupByPodcast !== groupByPodcast) setGroupByPodcast(currentParams.groupByPodcast)
    if (currentParams.groupByTopic !== groupByTopic) setGroupByTopic(currentParams.groupByTopic)
    if (currentParams.curationGroup !== selectedCurationGroupId) setSelectedCurationGroupId(currentParams.curationGroup)
    
    // Update date state if URL params changed
    const urlFrom = currentParams.from
    const urlTo = currentParams.to
    const urlDateRange = currentParams.dateRange
    
    if (urlFrom && urlTo) {
      if (urlFrom !== fromDate || urlTo !== toDate) {
        const fromTimestamp = dateToTimestamp(urlFrom)
        const toTimestamp = dateToEndOfDayTimestamp(urlTo)
        setFromDate(urlFrom)
        setToDate(urlTo)
        setSelectedDateRangePreset(urlDateRange || "custom")
        setAppliedFromDate(fromTimestamp)
        setAppliedToDate(toTimestamp)
      }
    } else if (urlDateRange && urlDateRange !== "custom" && urlDateRange !== selectedDateRangePreset) {
      const presetConfig = DATE_RANGE_PRESETS[urlDateRange as keyof typeof DATE_RANGE_PRESETS]
      if (presetConfig) {
        const { fromDate: from, toDate: to } = presetConfig.getDates()
        const formatDateOnly = (date: Date): string => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          return `${year}-${month}-${day}`
        }
        setFromDate(formatDateOnly(from))
        setToDate(formatDateOnly(to))
        setSelectedDateRangePreset(urlDateRange)
        setAppliedFromDate(from.getTime())
        setAppliedToDate(to.getTime())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Use debounce hook at top level for all filters
  const debouncedSearchTerm = useDebounce(searchInput, 500)
  const debouncedNotableQuotes = useDebounce(notableQuotesInput, 500)
  const debouncedPodcast = useDebounce(podcastInput, 500)
  const debouncedEpisode = useDebounce(episodeInput, 500)

  // Sync debounced text inputs to URL
  useEffect(() => {
    updateUrlParams({
      keywords: debouncedSearchTerm,
      notableQuotes: debouncedNotableQuotes,
      podcast: debouncedPodcast,
      episode: debouncedEpisode,
    })
  }, [debouncedSearchTerm, debouncedNotableQuotes, debouncedPodcast, debouncedEpisode, updateUrlParams])

  // Sync grouping options to URL
  useEffect(() => {
    updateUrlParams({
      groupByPodcast,
      groupByTopic,
    })
  }, [groupByPodcast, groupByTopic, updateUrlParams])

  // Sync date range to URL
  useEffect(() => {
    updateUrlParams({
      dateRange: selectedDateRangePreset,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
  }, [selectedDateRangePreset, fromDate, toDate, updateUrlParams])

  // Sync curation group to URL
  useEffect(() => {
    updateUrlParams({
      curationGroupId: selectedCurationGroupId || undefined,
    })
  }, [selectedCurationGroupId, updateUrlParams])

  // Fetch curation groups using useFetch hook
  const { data: curationGroupsData, loading: curationGroupsLoading } = useFetch(
    `${BASE_URL}/curationGroups/all`
  )

  // Build clips API URL based on debounced filters and date range
  const clipsUrl = useMemo(() => {
    const params: string[] = []
    
    if (debouncedSearchTerm) {
      params.push(`keyword=${encodeURIComponent(debouncedSearchTerm)}`)
    }
    if (debouncedNotableQuotes) {
      params.push(`notableQuotes=${encodeURIComponent(debouncedNotableQuotes)}`)
    }
    if (debouncedPodcast) {
      params.push(`podcast=${encodeURIComponent(debouncedPodcast)}`)
    }
    if (debouncedEpisode) {
      params.push(`episode=${encodeURIComponent(debouncedEpisode)}`)
    }
    
    // Use applied dates if available, otherwise use default dates
    const fromDateParam = appliedFromDate || 1768176060000
    const toDateParam = appliedToDate || 1768435199999
    
    const queryString = params.length > 0 ? `&${params.join("&")}` : ""
    return `${API_URL}/api/voicechat/v0/llm/curated/clip/suggestions/data?type=podcastEpisode&fromDate=${fromDateParam}&toDate=${toDateParam}${queryString}`
  }, [debouncedSearchTerm, debouncedNotableQuotes, debouncedPodcast, debouncedEpisode, appliedFromDate, appliedToDate])

  // Fetch clips using useFetch hook
  const { data: clipsData, loading: clipsLoading } = useFetch(clipsUrl)

  // Utility function to truncate text
  const textTruncate = (text: string, maxLength: number): string => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  // Utility function to format date to YYYY-MM-DD (for input type="date")
  const formatDateOnly = (date: Date | null): string => {
    if (!date) return ""
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Check if custom range is selected
  const isCustomRange = selectedDateRangePreset === "custom"

  // Handle preset range change
  const handlePresetRangeChange = (preset: string) => {
    setSelectedDateRangePreset(preset)
    
    if (preset === "custom") {
      // Keep current dates, apply them if both are set
      if (fromDate && toDate) {
        const fromTimestamp = dateToTimestamp(fromDate)
        const toTimestamp = dateToEndOfDayTimestamp(toDate)
        setAppliedFromDate(fromTimestamp)
        setAppliedToDate(toTimestamp)
      }
      return
    }

    const presetConfig = DATE_RANGE_PRESETS[preset as keyof typeof DATE_RANGE_PRESETS]
    if (presetConfig) {
      const { fromDate: from, toDate: to } = presetConfig.getDates()
      const fromStr = formatDateOnly(from)
      const toStr = formatDateOnly(to)
      
      setFromDate(fromStr)
      setToDate(toStr)
      setAppliedFromDate(from.getTime())
      setAppliedToDate(to.getTime())
    }
  }

  // Handle apply filters (for custom range)
  const handleApplyFilters = () => {
    if (!fromDate || !toDate) return
    
    const fromTimestamp = dateToTimestamp(fromDate)
    const toTimestamp = dateToEndOfDayTimestamp(toDate)
    
    // Update applied dates - this will trigger the API call via clipsUrl change
    setAppliedFromDate(fromTimestamp)
    setAppliedToDate(toTimestamp)
  }

  // Handle from date change
  const handleFromDateChange = (dateString: string) => {
    setFromDate(dateString)
    setSelectedDateRangePreset("custom")
    
    // Validate date range (ensure fromDate <= toDate)
    if (dateString && toDate && dateString > toDate) {
      setToDate(dateString)
    }
    
    // Don't apply dates automatically - wait for Apply button click
  }

  // Handle to date change
  const handleToDateChange = (dateString: string) => {
    setToDate(dateString)
    setSelectedDateRangePreset("custom")
    
    // Validate date range (ensure fromDate <= toDate)
    if (dateString && fromDate && dateString < fromDate) {
      setFromDate(dateString)
    }
    
    // Don't apply dates automatically - wait for Apply button click
  }

  // Process curation groups data
  const curationGroups: CurationGroup[] = React.useMemo(() => {
    if (!curationGroupsData) return []
    return Array.isArray(curationGroupsData) ? curationGroupsData : []
  }, [curationGroupsData])

  // Process clips data
  const clips: Clip[] = React.useMemo(() => {
    if (!clipsData) return []
    
    // Process the response data
    const clipsDataAny = clipsData as any
    const dataArray = (clipsDataAny && Array.isArray(clipsDataAny)) 
      ? clipsDataAny 
      : ((clipsDataAny && clipsDataAny.data && Array.isArray(clipsDataAny.data)) 
        ? clipsDataAny.data 
        : [])
    
    const processedClips = dataArray.map((item: any) => {
      return ((item || {}).clips || []).map((clip: any) => {
        const fullQuote = clip.notableQuote || clip.quote || ""
        return {
          title: clip.headline,
          quotes: textTruncate(fullQuote, 100),
          fullQuote: fullQuote,
          category: clip.category_id,
          description: clip.description,
          episode_title: item.episode_title,
          podcastName: item.podcastName,
          pubDate: item.pubDate,
          podcastSlug: item.podcastSlug,
          episodeSlug: item.episodeSlug,
          startTime: clip.startTime,
          endTime: clip.endTime,
          audioUrl: clip.audioUrl,
        }
      })
    })
    
    return processedClips.flat()
  }, [clipsData])

  // Group clips by podcast or topic
  interface GroupedClips {
    groupKey: string
    clips: Clip[]
  }

  const groupedClips: GroupedClips[] = React.useMemo(() => {
    if (!groupByPodcast && !groupByTopic) {
      return []
    }

    const groups = new Map<string, Clip[]>()

    clips.forEach((clip) => {
      let groupKey: string

      if (groupByPodcast) {
        groupKey = clip.podcastName || "Unknown Podcast"
      } else if (groupByTopic) {
        groupKey = clip.category || "Unknown Topic"
      } else {
        return
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(clip)
    })

    return Array.from(groups.entries())
      .map(([key, clips]) => ({
        groupKey: key,
        clips: clips,
      }))
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
  }, [clips, groupByPodcast, groupByTopic])

  // Combined loading state
  const isLoading = clipsLoading




  const handleReset = () => {
    setSearchInput("")
    setNotableQuotesInput("")
    setPodcastInput("")
    setEpisodeInput("")
    setGroupByPodcast(false)
    setGroupByTopic(false)
    setSelectedCurationGroupId("")
    // Reset to default 3 days range
    const resetDates = getDefault3DaysRange()
    setSelectedDateRangePreset("last7days")
    setFromDate(resetDates.fromDateStr)
    setToDate(resetDates.toDateStr)
    setAppliedFromDate(resetDates.fromTimestamp)
    setAppliedToDate(resetDates.toTimestamp)
    // Clear URL params using React Router
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  return (
    <div className="flex flex-col pb-6">
      {/* Filters Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-600 hover:text-gray-900"
          >
            Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Curation Group Filter */}
          <div className="space-y-2">
            <Select
              value={selectedCurationGroupId || "all"}
              onValueChange={(value) => setSelectedCurationGroupId(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Curation Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {curationGroupsLoading ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">Loading...</div>
                ) : (
                  curationGroups.map((group) => (
                    <SelectItem key={group._id} value={group._id}>
                      {group.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Search Filter */}
          <div className="space-y-2">
            <Input
              id="search"
              type="text"
              placeholder="Search by title or category..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400"
            />
          </div>

          {/* Notable Quotes Filter */}
          <div className="space-y-2">
            <Input
              id="notableQuotes"
              type="text"
              placeholder="Notable Quotes"
              value={notableQuotesInput}
              onChange={(e) => setNotableQuotesInput(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400"
            />
          </div>

          {/* Podcast Filter */}
          <div className="space-y-2">
            <Input
              id="podcast"
              type="text"
              placeholder="Podcast"
              value={podcastInput}
              onChange={(e) => setPodcastInput(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400"
            />
          </div>

          {/* Episode Filter */}
          <div className="space-y-2">
            <Input
              id="episode"
              type="text"
              placeholder="Episode"
              value={episodeInput}
              onChange={(e) => setEpisodeInput(e.target.value)}
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400"
            />
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-gray-200">
          {/* Date Range Preset Selector */}
          <div className="space-y-2">
            <Select value={selectedDateRangePreset} onValueChange={handlePresetRangeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Range</SelectItem>
                {Object.entries(DATE_RANGE_PRESETS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="space-y-2">
            <Input
              id="fromDateInput"
              type="date"
              placeholder="Start Date"
              value={fromDate}
              disabled={!isCustomRange}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 ${
                !isCustomRange ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* To Date */}
          <div className="space-y-2">
            <Input
              id="toDateInput"
              type="date"
              placeholder="End Date"
              value={toDate}
              disabled={!isCustomRange}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={`bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400 ${
                !isCustomRange ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Apply Button (only shown for custom range) */}
          {isCustomRange && (
            <div className="space-y-2">
              <Button
                onClick={handleApplyFilters}
                disabled={!fromDate || !toDate}
                className="w-full"
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        {/* Grouping Options */}
        <div className="flex items-center gap-6 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              id="groupByPodcast"
              checked={groupByPodcast}
              onChange={(e) => {
                const checked = e.target.checked
                setGroupByPodcast(checked)
                if (checked) {
                  setGroupByTopic(false)
                }
              }}
              className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
            />
            <label htmlFor="groupByPodcast" className="text-sm font-medium text-gray-700 cursor-pointer">
              Group by Podcast
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              id="groupByTopic"
              checked={groupByTopic}
              onChange={(e) => {
                const checked = e.target.checked
                setGroupByTopic(checked)
                if (checked) {
                  setGroupByPodcast(false)
                }
              }}
              className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
            />
            <label htmlFor="groupByTopic" className="text-sm font-medium text-gray-700 cursor-pointer">
              Group by Topic
            </label>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <Spinner className="size-8 text-gray-600" />
              <p className="text-sm text-gray-600 font-medium">Loading clips...</p>
            </div>
          </div>
        )}
        <table className="w-full table-auto">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Quotes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Podcast
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Episode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                Pub Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!isLoading && clips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No clips found matching your filters.
                </td>
              </tr>
            ) : groupByPodcast || groupByTopic ? (
              !isLoading && groupedClips.map((group, groupIndex) => (
                <React.Fragment key={group.groupKey}>
                  {/* Group Header Row */}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={7} className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {groupByPodcast ? "📻" : "🏷️"} {group.groupKey}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({group.clips.length} {group.clips.length === 1 ? "clip" : "clips"})
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Group Clips */}
                  {group.clips.map((clip, clipIndex) => {
                    const globalIndex = groupedClips
                      .slice(0, groupIndex)
                      .reduce((sum, g) => sum + g.clips.length, 0) + clipIndex
                    return (
                      <tr
                        key={`${clip.episodeSlug}-${groupIndex}-${clipIndex}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{globalIndex + 1}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 break-words">{clip.title || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 break-words">
                            {clip.description || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 break-words">
                            {clip.quotes || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 break-words">{clip.podcastName || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 break-words">{clip.episode_title || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {clip.pubDate 
                              ? new Date(clip.pubDate).toLocaleDateString() 
                              : "N/A"}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))
            ) : (
              !isLoading && clips.map((clip, index) => (
                <tr
                  key={`${clip.episodeSlug}-${index}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{index + 1}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 break-words">{clip.title || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 break-words">
                      {clip.description || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 break-words">
                      {clip.quotes || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 break-words">{clip.podcastName || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 break-words">{clip.episode_title || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {clip.pubDate 
                        ? new Date(clip.pubDate).toLocaleDateString() 
                        : "N/A"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <div className="text-sm text-gray-600 mt-4">
          {groupByPodcast || groupByTopic ? (
            <>
              Showing {clips.length} clips in {groupedClips.length} {groupedClips.length === 1 ? "group" : "groups"}
            </>
          ) : (
            <>Showing {clips.length} of {clips.length} clips</>
          )}
        </div>
      )}
    </div>
  )
}
