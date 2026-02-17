/**
 * SuggestedClipCard — Single AI-suggested clip card per SUGGEST_CLIP_COMPONENT_SPEC.
 * Title, description, notable quote (truncated 300), speakers, timecode/duration,
 * confidence/rating, play button, optional examples tooltip. active-suggestion when playing.
 */
import * as React from "react"
import { Play, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Spec: formatTimecode — minutes:seconds MM:SS; '00:00' for invalid. */
export function formatTimecode(timeInSeconds: number | undefined | null): string {
  if (timeInSeconds == null || Number.isNaN(Number(timeInSeconds))) return "00:00"
  const s = Math.floor(Number(timeInSeconds))
  if (s < 0) return "00:00"
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

/** Spec: formatDuration — duration (end - start) as M:SS; '0:00' for invalid. */
export function formatDuration(
  startSeconds: number | undefined | null,
  endSeconds: number | undefined | null
): string {
  if (
    startSeconds == null ||
    endSeconds == null ||
    Number.isNaN(Number(startSeconds)) ||
    Number.isNaN(Number(endSeconds))
  )
    return "0:00"
  const d = Math.max(0, Math.floor(Number(endSeconds) - Number(startSeconds)))
  const m = Math.floor(d / 60)
  const sec = d % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}

/** Spec: truncate notable quote to maxLen (default 300). */
export function textTruncateSmart(text: string | undefined | null, maxLen = 300): string {
  if (text == null || typeof text !== "string") return ""
  const t = text.trim()
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen).trim() + "…"
}

/** Spec: example item for tooltip. */
export type SuggestionExampleItem = { title: string; podcast: string }

export type SuggestedClipItem = {
  startTime: number
  endTime: number
  headline?: string
  title?: string
  description?: string
  notableQuote?: string
  speakers?: string[]
  confidenceScore?: number
  rating?: number
  appealScore?: number
  /** Spec: example array for tooltip (title, podcast per item). */
  example?: SuggestionExampleItem[]
  primaryTopicTag?: string
  toneTag?: string
  genreTag?: string
  [key: string]: unknown
}

export type SuggestedClipCardProps = {
  clip: SuggestedClipItem
  index: number
  isSelected?: boolean
  /** Spec: active-suggestion when this clip is playing. */
  isPlaying?: boolean
  onPlay?: (clip: SuggestedClipItem) => void
  onCreateClip?: (clip: SuggestedClipItem) => void
  className?: string
}

/** Spec: generateTooltipContent for suggestion.example array. */
function generateTooltipContent(
  example: SuggestionExampleItem[] | undefined,
  _index: number
): React.ReactNode {
  if (!example || !Array.isArray(example) || example.length === 0) {
    return <div className="text-sm">No examples available</div>
  }
  return (
    <div className="space-y-1">
      {example.map((item, idx) => (
        <div key={idx} className="text-sm">
          <p>
            {item.title} : <span className="font-medium text-primary">{item.podcast}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function SuggestedClipCard({
  clip,
  index,
  isSelected,
  isPlaying = false,
  onPlay,
  onCreateClip,
  className,
}: SuggestedClipCardProps) {
  const [tooltipOpen, setTooltipOpen] = React.useState(false)
  const title = clip.headline ?? clip.title ?? ""
  const description = clip.description ?? ""
  const notableQuote = textTruncateSmart(clip.notableQuote ?? "", 300)
  const startTime = Number(clip.startTime) ?? 0
  const endTime = Number(clip.endTime) ?? 0
  const hasExamples = Array.isArray(clip.example) && clip.example.length > 0

  const timecodeStr = `${formatTimecode(startTime)} - ${formatTimecode(endTime)}`
  const durationStr = formatDuration(startTime, endTime)
  const confidence = clip.confidenceScore
  const rating = clip.rating
  const appealScore = clip.appealScore
  const speakers = clip.speakers

  const handlePlay = () => {
    onPlay?.(clip)
  }

  return (
    <div
      className={cn(
        "suggestion-item rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors",
        isPlaying && "active-suggestion border-l-4 border-l-primary bg-primary/5",
        isSelected && "ring-2 ring-primary",
        className
      )}
    >
      <div className="flex gap-3">
        <span className="text-muted-foreground shrink-0 font-medium">{index}.</span>
        <div className="min-w-0 flex-1 space-y-2">
          <h4 className="suggestion-item-title text-base font-semibold leading-tight text-foreground">
            {title || "Untitled clip"}
          </h4>
          {description && (
            <p className="small text-sm text-muted-foreground">{description}</p>
          )}
          {notableQuote && (
            <div className="small rounded border border-border/60 bg-muted/30 p-2 text-sm">
              <span className="font-medium text-foreground">Notable Quote:</span>{" "}
              <span className="text-muted-foreground">{notableQuote}</span>
            </div>
          )}
          {speakers && speakers.length > 0 && (
            <p className="small text-xs text-muted-foreground">
              Speakers: {speakers.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Spec: play button (play-button) */}
            <Button
              type="button"
              size="sm"
              variant="default"
              className="play-button h-10 w-10 rounded-full p-0"
              onClick={handlePlay}
              aria-label="Play clip"
            >
              <Play className="h-4 w-4" />
            </Button>
            {hasExamples && (
              <div className="info-button-container relative inline-block">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="info-button h-8 w-8 rounded-full"
                  onMouseEnter={() => setTooltipOpen(true)}
                  onMouseLeave={() => setTooltipOpen(false)}
                  onFocus={() => setTooltipOpen(true)}
                  onBlur={() => setTooltipOpen(false)}
                  aria-label="Show examples"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
                {tooltipOpen && (
                  <div
                    className="sc-tooltip absolute bottom-full left-1/2 z-[1000] max-w-[350px] -translate-x-1/2 translate-y-1 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                    role="tooltip"
                  >
                    {generateTooltipContent(clip.example, index)}
                  </div>
                )}
              </div>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">{timecodeStr}</span>
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {durationStr}
            </span>
            {(confidence != null || rating != null || appealScore != null) && (
              <span className="text-xs text-muted-foreground">
                {confidence != null && `Confidence: ${confidence}/10`}
                {confidence != null && (rating != null || appealScore != null) && " · "}
                {rating != null && `Rating: ${rating}/10`}
                {appealScore != null && (confidence != null || rating != null) ? " · " : ""}
                {appealScore != null && `Appeal: ${appealScore}`}
              </span>
            )}
          </div>
          {onCreateClip && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => onCreateClip(clip)}
            >
              Create Clip
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
