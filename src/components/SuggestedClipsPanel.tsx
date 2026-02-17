/**
 * SuggestedClipsPanel — Right panel per SUGGEST_CLIP_COMPONENT_SPEC.
 * Category/model tabs, loading (with optional loadingMessage), error, standby message,
 * suggestions list with playingIndex for active-suggestion. Optional selectedClip autoplay.
 */
import * as React from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SuggestedClipCard, type SuggestedClipItem } from "@/components/SuggestedClipCard"
import { cn } from "@/lib/utils"

export type CategoryModelTab = { id: string; label: string }

export type SuggestedClipsPanelProps = {
  /** Tabs for V1, V2, V3, V4, VTest */
  categoryTabs?: CategoryModelTab[]
  activeTabId?: string
  onTabChange?: (id: string) => void
  categoryOptions?: { value: string; label: string }[]
  selectedCategory?: string
  onCategoryChange?: (value: string) => void
  interviewLabel?: string
  interviewSubLabel?: string
  onLogsClick?: () => void
  clips?: SuggestedClipItem[]
  selectedClip?: SuggestedClipItem | null
  onPlayClip?: (clip: SuggestedClipItem) => void
  onCreateClip?: (clip: SuggestedClipItem) => void
  onRefresh?: () => void
  /** Spec: true while generate or polling in progress. */
  isLoading?: boolean
  /** Spec: optional message when polling (e.g. "Fetching Clip Suggestions..."). */
  loadingMessage?: string | null
  /** Spec: error message to show (e.g. API failure, no transcript). */
  error?: string | null
  /** Spec: when true, show results/loading/error area. Default true when clips or loading or error. */
  showResults?: boolean
  emptyMessage?: string
  /** Spec: autoplay matching suggestion once when selectedClip is set (by title or time). */
  enableSelectedClipAutoplay?: boolean
  className?: string
}

const DEFAULT_TABS: CategoryModelTab[] = [
  { id: "v1", label: "V1" },
  { id: "v2", label: "V2" },
  { id: "v3", label: "V3" },
  { id: "v4", label: "V4" },
  { id: "vtest", label: "VTest" },
]

/** Spec: match selectedClip to a suggestion by title or by time (overlap or within 3s). */
function findMatchingClipIndex(
  clips: SuggestedClipItem[],
  selected: SuggestedClipItem
): number {
  const titleA = (selected.headline ?? selected.title ?? "").trim().toLowerCase()
  for (let i = 0; i < clips.length; i++) {
    const t = (clips[i].headline ?? clips[i].title ?? "").trim().toLowerCase()
    if (titleA && t && t.includes(titleA)) return i
  }
  const start = Number(selected.startTime) ?? 0
  const end = Number(selected.endTime) ?? start + 60
  let best = -1
  let bestDist = 4
  for (let i = 0; i < clips.length; i++) {
    const s = Number(clips[i].startTime) ?? 0
    const e = Number(clips[i].endTime) ?? s + 60
    const overlap = start < e && end > s
    if (overlap) return i
    const dist = Math.min(Math.abs(start - e), Math.abs(end - s))
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

export function SuggestedClipsPanel({
  categoryTabs = DEFAULT_TABS,
  activeTabId = "v4",
  onTabChange,
  categoryOptions = [],
  selectedCategory,
  onCategoryChange,
  interviewLabel = "Serious Interview V4",
  interviewSubLabel = "NOVA_LITE",
  onLogsClick,
  clips = [],
  selectedClip,
  onPlayClip,
  onCreateClip,
  onRefresh,
  isLoading,
  loadingMessage,
  error,
  showResults = true,
  emptyMessage = "No suggested clips for this category.",
  enableSelectedClipAutoplay = false,
  className,
}: SuggestedClipsPanelProps) {
  /** Spec: playingIndex — index of suggestion currently "playing" for active-suggestion styling. */
  const [playingIndex, setPlayingIndex] = React.useState<number | null>(null)
  /** Spec: guard so autoplay for selectedClip runs only once per selected clip. */
  const hasAutoPlayedForSelectedClipRef = React.useRef(false)

  const isSelected = React.useCallback(
    (clip: SuggestedClipItem): boolean =>
      Boolean(
        selectedClip &&
          clip.startTime === selectedClip.startTime &&
          clip.endTime === selectedClip.endTime
      ),
    [selectedClip]
  )

  const handlePlayClip = React.useCallback(
    (clip: SuggestedClipItem) => {
      const idx = clips.findIndex(
        (c) => c.startTime === clip.startTime && c.endTime === clip.endTime
      )
      setPlayingIndex(idx >= 0 ? idx : null)
      onPlayClip?.(clip)
    },
    [clips, onPlayClip]
  )

  // Spec: autoplaySelectedClip — when selectedClip is set, match and play once.
  React.useEffect(() => {
    if (!enableSelectedClipAutoplay || !selectedClip || !onPlayClip || clips.length === 0)
      return
    if (hasAutoPlayedForSelectedClipRef.current) return
    const match = findMatchingClipIndex(clips, selectedClip)
    if (match < 0) return
    hasAutoPlayedForSelectedClipRef.current = true
    setPlayingIndex(match)
    onPlayClip(clips[match])
  }, [selectedClip, clips, onPlayClip, enableSelectedClipAutoplay])

  React.useEffect(() => {
    if (!selectedClip) hasAutoPlayedForSelectedClipRef.current = false
  }, [selectedClip])

  const showContent = showResults !== false

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col border-l bg-muted/20", className)}>
      {/* Header: refresh, tabs, category, interview info */}
      <div className="flex shrink-0 flex-col gap-3 border-b bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh suggestions"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
          <div className="flex flex-1 flex-wrap gap-1">
            {categoryTabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTabId === tab.id ? "default" : "outline"}
                size="sm"
                className="min-w-0"
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        {categoryOptions.length > 0 && (
          <Select
            value={selectedCategory ?? categoryOptions[0]?.value ?? ""}
            onValueChange={(v) => onCategoryChange?.(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(interviewLabel || onLogsClick) && (
          <div className="flex items-center justify-between text-sm">
            <div>
              {interviewLabel && (
                <span className="font-medium text-foreground">{interviewLabel}</span>
              )}
              {interviewSubLabel && (
                <span className="ml-1 text-muted-foreground">{interviewSubLabel}</span>
              )}
            </div>
            {onLogsClick && (
              <Button type="button" variant="ghost" size="sm" onClick={onLogsClick}>
                Logs
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Spec: content only when showResults; loading (with message), error, standby, or list */}
      {showContent && (
        <div className="suggestions-container min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {loadingMessage ?? "Analyzing transcript with AI..."}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Generating clip suggestions. Standby for results." : emptyMessage}
            </p>
          ) : (
            <ul className="space-y-3">
              {clips.map((clip, i) => (
                <li key={`${clip.startTime}-${clip.endTime}-${i}`}>
                  <SuggestedClipCard
                    clip={clip}
                    index={i + 1}
                    isSelected={isSelected(clip)}
                    isPlaying={playingIndex === i}
                    onPlay={handlePlayClip}
                    onCreateClip={onCreateClip}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
