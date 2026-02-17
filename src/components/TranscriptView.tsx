/**
 * TranscriptView — Transcript list per TRANSCRIPT_COMPONENT_SPEC.md.
 * Sentence + word highlight from currentTime, auto-scroll (center), click-to-seek,
 * optional search (next/prev, scroll to match), selectedClip focus.
 */
import * as React from "react"
import { Search, X, ChevronLeft, ChevronRight, RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatTime } from "@/components/AudioTrimmer/utils"

/** Spec: time string HH:MM:SS (or MM:SS, S) to seconds. */
function timeStringToSeconds(timeString: string | number | undefined | null): number {
  if (timeString == null) return 0
  if (typeof timeString === "number" && Number.isFinite(timeString)) return timeString
  const s = String(timeString).trim()
  if (!s) return 0
  const parts = s.split(":").map((p) => parseInt(p, 10))
  if (parts.some((n) => isNaN(n))) return 0
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

/**
 * Transcript segment per TRANSCRIPT_COMPONENT_SPEC.md — Response keys in detail.
 * Spec required: sentence, speaker. Time: start_time/end_time (HH:MM:SS) or startTime/endTime (seconds).
 */
export type TranscriptSegment = {
  /** Spec: full text of the segment. */
  sentence?: string
  /** Spec: start time HH:MM:SS (or use startTime when API does not send start_time). */
  start_time?: string | number
  /** Spec: end time HH:MM:SS. */
  end_time?: string | number
  /** Optional: start time in seconds when start_time is not present (spec: getItemStartTime order). */
  startTime?: number | string
  /** Optional: end time in seconds when end_time is not present (spec: getItemEndTime order). */
  endTime?: number | string
  /** Spec: speaker label. */
  speaker?: string
  /** Optional: alias for sentence when API uses different key. */
  text?: string
}

export type WordTiming = {
  globalIndex: number
  sentenceIndex: number
  wordIndex: number
  word: string
  startTime: number
  endTime: number
  sentence: string
  speaker: string
}

export type SearchResult = {
  sentenceIndex: number
  wordIndices: number[]
  matchText: string
  matchStart: number
  matchEnd: number
}

export type SelectedClip = {
  startTime?: number
  endTime?: number
  start_time?: string | number
  end_time?: string | number
}

export type TranscriptViewProps = {
  /** Spec: transcriptData; alias segments for backward compat. */
  transcriptData?: TranscriptSegment[]
  segments?: TranscriptSegment[]
  currentTime?: number
  isPlaying?: boolean
  /** Spec: autoScrollEnabled. When true, scroll active line into view (center). */
  autoScrollEnabled?: boolean
  autoScroll?: boolean
  onAutoScrollChange?: (value: boolean) => void
  showSearchBar?: boolean
  onSearchBarClose?: () => void
  onTranscriptClick?: (startTime: number, endTime: number, index: number) => void
  selectedClip?: SelectedClip | null
  enableSearchKeyboardShortcuts?: boolean
  /** Legacy: download/refresh/search click (optional). */
  onSearchClick?: () => void
  onRefreshClick?: () => void
  onDownload?: () => void
  downloadLabel?: string
  highlightedSegmentIndex?: number
  highlightWordInSegment?: { segmentIndex: number; word: string }
  className?: string
}

/** Spec: getItemStartTime — startTime (number) first, then start_time, then startTime (string). */
function getSegmentStart(seg: TranscriptSegment): number {
  if (typeof seg.startTime === "number" && Number.isFinite(seg.startTime)) return seg.startTime
  if (seg.start_time != null) return timeStringToSeconds(seg.start_time)
  if (seg.startTime != null) return timeStringToSeconds(String(seg.startTime))
  return 0
}

/** Spec: getItemEndTime — endTime (number) first, then end_time, then endTime (string). */
function getSegmentEnd(seg: TranscriptSegment, fallbackStart: number): number {
  if (typeof seg.endTime === "number" && Number.isFinite(seg.endTime)) return seg.endTime
  if (seg.end_time != null) return timeStringToSeconds(seg.end_time)
  if (seg.endTime != null) return timeStringToSeconds(String(seg.endTime))
  return fallbackStart + 60
}

/** Spec: segment text from sentence (with optional text alias for backward compat). */
function getSegmentText(seg: TranscriptSegment): string {
  return (seg.sentence ?? (seg as { text?: string }).text ?? "").trim()
}

function processWordTimings(
  segments: TranscriptSegment[]
): WordTiming[] {
  const out: WordTiming[] = []
  let globalIndex = 0
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]
    const start = getSegmentStart(seg)
    const end = getSegmentEnd(seg, start)
    const sentence = getSegmentText(seg)
    const speaker = seg.speaker ?? ""
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length === 0) continue
    const wordDuration = (end - start) / words.length
    for (let wi = 0; wi < words.length; wi++) {
      const wordStartTime = start + wi * wordDuration
      const wordEndTime = start + (wi + 1) * wordDuration
      out.push({
        globalIndex,
        sentenceIndex: si,
        wordIndex: wi,
        word: words[wi],
        startTime: wordStartTime,
        endTime: wordEndTime,
        sentence,
        speaker,
      })
      globalIndex++
    }
  }
  return out
}

export function TranscriptView({
  transcriptData: transcriptDataProp,
  segments: segmentsProp,
  currentTime = 0,
  isPlaying = false,
  autoScrollEnabled: autoScrollEnabledProp,
  autoScroll,
  onAutoScrollChange,
  showSearchBar: showSearchBarControlled,
  onSearchBarClose,
  onTranscriptClick,
  selectedClip,
  enableSearchKeyboardShortcuts = false,
  onSearchClick,
  onRefreshClick,
  onDownload,
  downloadLabel = "Download",
  highlightedSegmentIndex,
  highlightWordInSegment: _highlightWordInSegment,
  className,
}: TranscriptViewProps) {
  const data = transcriptDataProp ?? segmentsProp ?? []
  const autoScrollEnabled = autoScrollEnabledProp ?? autoScroll ?? true

  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const clickHighlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = React.useRef(true)
  const currentTimeRef = React.useRef(currentTime)
  currentTimeRef.current = currentTime

  const [currentTranscriptIndex, setCurrentTranscriptIndex] = React.useState(-1)
  const [_highlightedTranscriptIndex, setHighlightedTranscriptIndex] = React.useState(-1)
  const [clickedTranscriptIndex, setClickedTranscriptIndex] = React.useState(-1)
  const [currentWordIndex, setCurrentWordIndex] = React.useState(-1)
  const [currentSentenceIndex, setCurrentSentenceIndex] = React.useState(-1)
  const [wordTimings, setWordTimings] = React.useState<WordTiming[]>([])
  const [_highlightedWords, setHighlightedWords] = React.useState<number[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = React.useState(-1)
  const [showSearchBarState, setShowSearchBarState] = React.useState(false)

  const showSearchBar =
    showSearchBarControlled !== undefined ? showSearchBarControlled : showSearchBarState

  const setShowSearchBar = React.useCallback(
    (show: boolean) => {
      if (showSearchBarControlled === undefined) setShowSearchBarState(show)
      if (show && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (!show) {
        setSearchQuery("")
        setSearchResults([])
        setCurrentSearchIndex(-1)
        onSearchBarClose?.()
      }
    },
    [showSearchBarControlled, onSearchBarClose]
  )

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (clickHighlightTimeoutRef.current) clearTimeout(clickHighlightTimeoutRef.current)
    }
  }, [])

  function processAndSetWordTimings() {
    if (!data.length) {
      setWordTimings([])
      setCurrentWordIndex(-1)
      setCurrentSentenceIndex(-1)
      setHighlightedWords([])
      return
    }
    const timings = processWordTimings(data)
    setWordTimings(timings)
    setCurrentWordIndex(-1)
    setCurrentSentenceIndex(-1)
    setHighlightedWords([])
  }

  const scrollToTranscriptIndex = React.useCallback(
    (index: number, forceScroll = false) => {
      if (!forceScroll && !autoScrollEnabled) return
      const container = containerRef.current
      if (!container) return
      const el = container.querySelector(`[data-transcript-index="${index}"]`) as HTMLElement
      if (!el) return
      // Use getBoundingClientRect so position is correct regardless of offsetParent (nested flex/position).
      const runScroll = () => {
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop
        const targetScrollTop =
          relativeTop - container.clientHeight / 2 + el.offsetHeight / 2
        const clampedScrollTop = Math.max(
          0,
          Math.min(targetScrollTop, container.scrollHeight - container.clientHeight)
        )
        container.scrollTo({ top: clampedScrollTop, behavior: "smooth" })
      }
      requestAnimationFrame(runScroll)
    },
    [autoScrollEnabled]
  )

  const updateWordHighlighting = React.useCallback(
    (t: number) => {
      if (!wordTimings.length) return
      let found = wordTimings.findIndex((w) => t >= w.startTime && t <= w.endTime)
      if (found === -1) {
        let minDist = Infinity
        for (let i = 0; i < wordTimings.length; i++) {
          const w = wordTimings[i]
          const d = Math.min(Math.abs(t - w.startTime), Math.abs(t - w.endTime))
          if (d < minDist) {
            minDist = d
            found = i
          }
        }
      }
      const word = found >= 0 ? wordTimings[found] : null
      const newWordIndex = word ? word.globalIndex : -1
      const newSentenceIndex = word ? word.sentenceIndex : -1
      setCurrentWordIndex(newWordIndex)
      setCurrentSentenceIndex(newSentenceIndex)
      setHighlightedWords(newWordIndex >= 0 ? [newWordIndex] : [])
    },
    [wordTimings]
  )

  const updateTranscriptHighlighting = React.useCallback(
    (t: number) => {
      if (!data.length) return
      let activeIndex = -1
      for (let i = 0; i < data.length; i++) {
        const start = getSegmentStart(data[i])
        const end = getSegmentEnd(data[i], start)
        if (t >= start && t <= end) {
          activeIndex = i
          break
        }
      }
      if (activeIndex === -1) {
        let minDist = Infinity
        for (let i = 0; i < data.length; i++) {
          const start = getSegmentStart(data[i])
          const end = getSegmentEnd(data[i], start)
          const d = Math.min(
            Math.abs(t - start),
            Math.abs(t - end)
          )
          if (d < minDist) {
            minDist = d
            activeIndex = i
          }
        }
      }
      if (activeIndex !== -1 && activeIndex !== currentTranscriptIndex) {
    setCurrentTranscriptIndex(activeIndex)
    scrollToTranscriptIndex(activeIndex)
      }
      updateWordHighlighting(t)
    },
    [
      data,
      currentTranscriptIndex,
      scrollToTranscriptIndex,
      updateWordHighlighting,
    ]
  )

  const applyTranscriptHighlight = React.useCallback(
    (index: number) => {
      const container = containerRef.current
      if (!container) return
      container.querySelectorAll(".tc-initial-click-highlight").forEach((el) => {
        el.classList.remove("tc-initial-click-highlight")
      })
      const el = container.querySelector(`[data-transcript-index="${index}"]`) as HTMLElement
      if (el) {
        el.classList.add("tc-initial-click-highlight")
        scrollToTranscriptIndex(index)
        if (clickHighlightTimeoutRef.current) clearTimeout(clickHighlightTimeoutRef.current)
        clickHighlightTimeoutRef.current = setTimeout(() => {
          el.classList.remove("tc-initial-click-highlight")
          clickHighlightTimeoutRef.current = null
        }, 3000)
      }
    },
    [scrollToTranscriptIndex]
  )

  const focusTranscriptForSelectedClip = React.useCallback(() => {
    if (!selectedClip || !data.length) return
    const selectedStart =
      selectedClip.startTime ?? timeStringToSeconds(selectedClip.start_time)
    const selectedEnd =
      selectedClip.endTime ?? timeStringToSeconds(selectedClip.end_time) ?? selectedStart + 60
    let targetIndex = -1
    for (let i = 0; i < data.length; i++) {
      const start = getSegmentStart(data[i])
      const end = getSegmentEnd(data[i], start)
      if (selectedStart >= start && selectedStart <= end) {
        targetIndex = i
        break
      }
    }
    if (targetIndex === -1) {
      let minDist = Infinity
      for (let i = 0; i < data.length; i++) {
        const start = getSegmentStart(data[i])
        const end = getSegmentEnd(data[i], start)
        const d = Math.min(
          Math.abs(selectedStart - start),
          Math.abs(selectedStart - end)
        )
        if (d < minDist) {
          minDist = d
          targetIndex = i
        }
      }
    }
    if (targetIndex === -1) return
    setCurrentTranscriptIndex(targetIndex)
    setClickedTranscriptIndex(targetIndex)
    setHighlightedTranscriptIndex(targetIndex)
    applyTranscriptHighlight(targetIndex)
    onTranscriptClick?.(selectedStart, selectedEnd, targetIndex)
  }, [selectedClip, data, applyTranscriptHighlight, onTranscriptClick])

  function handleTranscriptClick(item: TranscriptSegment, index: number) {
    const startTime = getSegmentStart(item)
    const endTime = getSegmentEnd(item, startTime)
    setCurrentTranscriptIndex(index)
    setClickedTranscriptIndex(index)
    setHighlightedTranscriptIndex(index)
    applyTranscriptHighlight(index)
    onTranscriptClick?.(startTime, endTime, index)
  }

  const performSearch = React.useCallback(
    (queryOverride?: string) => {
      const q = (queryOverride ?? searchQuery).toLowerCase().trim()
      if (!q || !data.length) {
      setSearchResults([])
      setCurrentSearchIndex(-1)
        return
      }
      const results: SearchResult[] = []
      data.forEach((seg, sentenceIndex) => {
        const sentenceText = getSegmentText(seg).toLowerCase()
        let searchIndex = 0
        while (true) {
          const idx = sentenceText.indexOf(q, searchIndex)
          if (idx === -1) break
          const matchEnd = idx + q.length
          const words = getSegmentText(seg).split(/\s+/).filter(Boolean)
          let charCount = 0
          const wordIndices: number[] = []
          words.forEach((w, wi) => {
            const start = charCount
            const end = charCount + w.length
            charCount = end + 1
            if (idx < end && matchEnd > start) wordIndices.push(wi)
          })
          results.push({
            sentenceIndex,
            wordIndices,
            matchText: q,
            matchStart: idx,
            matchEnd,
          })
          searchIndex = idx + 1
        }
      })
      setSearchResults(results)
      setCurrentSearchIndex(results.length > 0 ? 0 : -1)
    },
    [data, searchQuery]
  )


  function navigateToNextMatch() {
    if (searchResults.length === 0) return
    const next = (currentSearchIndex + 1) % searchResults.length
    setCurrentSearchIndex(next)
  }

  function navigateToPreviousMatch() {
    if (searchResults.length === 0) return
    const prev = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1
    setCurrentSearchIndex(prev)
  }

  function handleSearchQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setSearchQuery(v)
    performSearch(v)
  }

  React.useEffect(() => {
    if (searchResults.length === 0 || currentSearchIndex < 0) return
    const container = containerRef.current
    if (!container) return
    const result = searchResults[currentSearchIndex]
    const el = container.querySelector(
      `[data-transcript-index="${result.sentenceIndex}"]`
    ) as HTMLElement
    if (!el) return
    const runScroll = () => {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const relativeTop = elRect.top - containerRect.top + container.scrollTop
      const targetScrollTop =
        relativeTop - container.clientHeight / 2 + el.offsetHeight / 2
      const clampedScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, container.scrollHeight - container.clientHeight)
      )
      container.scrollTo({ top: clampedScrollTop, behavior: "smooth" })
    }
    requestAnimationFrame(runScroll)
  }, [currentSearchIndex, searchResults])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) navigateToPreviousMatch()
      else navigateToNextMatch()
    } else if (e.key === "Escape") {
      setShowSearchBar(false)
    }
  }

  const handleGlobalKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        setShowSearchBar(true)
      }
    },
    [setShowSearchBar]
  )

  function getHighlightedWordsForSentence(sentenceIndex: number): number[] {
    if (currentSentenceIndex !== sentenceIndex || currentWordIndex === -1) return []
    const entry = wordTimings.find(
      (w) => w.sentenceIndex === sentenceIndex && w.globalIndex === currentWordIndex
    )
    if (!entry) return []
    return [entry.wordIndex]
  }

  function isWordInSearchMatch(sentenceIndex: number, wordIndex: number): boolean {
    const r = searchResults[currentSearchIndex]
    if (!r) return false
    return r.sentenceIndex === sentenceIndex && r.wordIndices.includes(wordIndex)
  }

  function isWordInAnySearchMatch(sentenceIndex: number, wordIndex: number): boolean {
    return searchResults.some(
      (r, i) => i !== currentSearchIndex && r.sentenceIndex === sentenceIndex && r.wordIndices.includes(wordIndex)
    )
  }

  function renderSentenceWithWordHighlighting(seg: TranscriptSegment, sentenceIndex: number) {
    const sentence = getSegmentText(seg)
    const words = sentence.split(/\s+/).filter(Boolean)
    const highlighted = getHighlightedWordsForSentence(sentenceIndex)
    return words.map((word, wordIndex) => {
      const isHighlighted = highlighted.includes(wordIndex)
      const isCurrentSearchMatch = isWordInSearchMatch(sentenceIndex, wordIndex)
      const isOtherSearchMatch = isWordInAnySearchMatch(sentenceIndex, wordIndex)
      const cls = cn(
        "tc-word inline-block mr-1",
        isHighlighted && "tc-word-highlight rounded px-0.5 bg-[#FF6B35] text-white font-bold",
        isCurrentSearchMatch && "tc-search-current bg-amber-300/90 dark:bg-amber-600/50",
        isOtherSearchMatch && !isHighlighted && "tc-search-match bg-amber-100/80 dark:bg-amber-900/30"
      )
      return (
        <span key={`${sentenceIndex}-${wordIndex}`} className={cls}>
          {word}
        </span>
      )
    })
  }

  React.useEffect(() => {
    processAndSetWordTimings()
    if (selectedClip) focusTranscriptForSelectedClip()
  }, [data, selectedClip])

  // Spec: initial sync after word-timings state has committed so highlight/scroll match playback position.
  React.useEffect(() => {
    if (!data.length || !wordTimings.length) return
    const t = currentTimeRef.current
    if (typeof t !== "number" || t < 0) return
    const id = setTimeout(() => updateTranscriptHighlighting(t), 0)
    return () => clearTimeout(id)
  }, [data, wordTimings.length, updateTranscriptHighlighting])

  React.useEffect(() => {
    updateTranscriptHighlighting(currentTime)
  }, [currentTime, data, updateTranscriptHighlighting])

  React.useEffect(() => {
    if (showSearchBarControlled !== undefined && showSearchBarControlled !== showSearchBarState) {
      setShowSearchBarState(showSearchBarControlled)
    }
  }, [showSearchBarControlled])

  React.useEffect(() => {
    if (selectedClip) focusTranscriptForSelectedClip()
  }, [selectedClip])

  React.useEffect(() => {
    if (!enableSearchKeyboardShortcuts) return
    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => document.removeEventListener("keydown", handleGlobalKeyDown)
  }, [enableSearchKeyboardShortcuts, handleGlobalKeyDown])

  if (!data.length) {
    return (
      <div className={cn("tc-wrapper flex min-h-0 flex-1 flex-col", className)}>
        <p className="text-sm text-muted-foreground">No transcript available.</p>
      </div>
    )
  }

  const renderSearchBar = () => {
    if (!showSearchBar) {
      if (showSearchBarControlled !== undefined) return null
      return (
        <div className="tc-search-toggle sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-background/95 py-2 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSearchBar(true)}
            className="tc-search-toggle-btn"
          >
            <Search className="mr-1 h-4 w-4" />
            Search
          </Button>
          {onAutoScrollChange && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoScrollEnabled}
                onChange={(e) => onAutoScrollChange?.(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Auto-scroll
            </label>
          )}
          {onSearchClick && (
            <Button type="button" variant="ghost" size="icon" onClick={onSearchClick} aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          )}
          {onRefreshClick && (
            <Button type="button" variant="ghost" size="icon" onClick={onRefreshClick} aria-label="Refresh">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button type="button" variant="ghost" size="sm" onClick={onDownload}>
              <Download className="mr-1 h-4 w-4" />
              {downloadLabel}
            </Button>
          )}
        </div>
      )
    }
    return (
      <div className="tc-search-bar sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/95 py-2 backdrop-blur">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search transcript..."
          value={searchQuery}
          onChange={handleSearchQueryChange}
          onKeyDown={handleSearchKeyDown}
          className="tc-search-input max-w-[200px]"
          aria-label="Search transcript"
        />
        <span className="tc-search-results-text text-sm text-muted-foreground">
          {searchResults.length > 0
            ? `${currentSearchIndex + 1} of ${searchResults.length}`
            : "No results"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={navigateToPreviousMatch}
          disabled={searchResults.length === 0}
          className="tc-search-nav-btn"
          aria-label="Previous match"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={navigateToNextMatch}
          disabled={searchResults.length === 0}
          className="tc-search-nav-btn"
          aria-label="Next match"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchQuery("")
            setSearchResults([])
            setCurrentSearchIndex(-1)
          }}
          className="tc-search-clear-btn"
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowSearchBar(false)}
          className="tc-search-close-btn"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("tc-wrapper flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {renderSearchBar()}
      <div
        ref={containerRef}
        className="tc-container min-h-0 flex-1 overflow-y-auto py-2 pr-2 scroll-smooth"
      >
        {data.map((item, index) => {
          const startTime = getSegmentStart(item)
          const isActive = index === currentTranscriptIndex && isPlaying
          const isClickedItem = index === clickedTranscriptIndex && isPlaying
          const isHighlighted = highlightedSegmentIndex === index
          return (
            <div
              key={`${startTime}-${index}`}
              data-transcript-index={index}
              role="button"
              tabIndex={0}
              className={cn(
                "tc-item relative flex cursor-pointer gap-1 rounded pl-4 pr-2 py-1.5 text-left text-sm transition-colors border-b border-transparent",
                "hover:bg-muted/80",
                isActive && "active-line bg-primary/10 border-l-4 border-l-primary font-medium",
                isClickedItem && "tc-initial-click-highlight bg-amber-200/50 dark:bg-amber-900/30",
                isHighlighted && "bg-amber-100/80 dark:bg-amber-900/20"
              )}
              onClick={() => handleTranscriptClick(item, index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleTranscriptClick(item, index)
                }
              }}
            >
              {isActive && (
                <span
                  className="tc-playing-indicator absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]"
                  aria-hidden
                >
                  ▶
                </span>
              )}
              <small className="tc-time shrink-0 tabular-nums text-muted-foreground">
                [{formatTime(startTime)}]
              </small>
              {item.speaker && (
                <small className="tc-speaker shrink-0 font-semibold whitespace-nowrap">
                  {item.speaker}:
                </small>
              )}
              <span
                className={cn(
                  "tc-text flex-1",
                  isActive && "active-text text-primary font-medium"
                )}
              >
                {renderSentenceWithWordHighlighting(item, index)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
