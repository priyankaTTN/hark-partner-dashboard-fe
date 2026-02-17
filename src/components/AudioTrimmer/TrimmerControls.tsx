/**
 * TrimmerControls: Waveform container, playback (viewOnly + full), zoom, time labels.
 */
import * as React from "react"
import { Play, Pause, ZoomIn, ZoomOut, SkipBack, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime } from "./utils"

/** Spec: minHeight 120px so waveform + timeline are visible; overflow visible to avoid clipping timeline. */
const WAVEFORM_MIN_HEIGHT = 120

export const WaveformContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "wavesurfer-container waveform-with-timeline relative w-full rounded-md border border-input bg-muted/30",
      className
    )}
    style={{ minHeight: WAVEFORM_MIN_HEIGHT, overflow: "visible", ...style }}
    {...props}
  />
))

WaveformContainer.displayName = "WaveformContainer"

type PlaybackControlsViewOnlyProps = {
  isPlaying: boolean
  onPlayPause: () => void
  currentTime: number
  duration: number
  disabled?: boolean
  className?: string
}

export function PlaybackControlsViewOnly({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  disabled,
  className,
}: PlaybackControlsViewOnlyProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Resume from current position"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

type PlaybackControlsProps = {
  isPlaying: boolean
  onPlayPause: () => void
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
  onSetStart: () => void
  onSetEnd: () => void
  onGoToStart: () => void
  onCreateClip?: () => void
  showCreateClipButton?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  playbackRate,
  onPlaybackRateChange,
  onSetStart,
  onSetEnd,
  onGoToStart,
  onCreateClip,
  showCreateClipButton,
  disabled,
  className,
  children,
}: PlaybackControlsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Resume from current position"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={playbackRate}
        onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
        disabled={disabled}
        aria-label="Playback speed"
      >
        {SPEED_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}x
          </option>
        ))}
      </select>
      <Button type="button" variant="outline" size="sm" onClick={onSetStart} disabled={disabled}>
        Set Start
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onSetEnd} disabled={disabled}>
        Set End
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onGoToStart}
        disabled={disabled}
        aria-label="Go to start"
        title="Go to Start Point"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      {children}
      {showCreateClipButton && onCreateClip && (
        <Button type="button" size="sm" onClick={onCreateClip} disabled={disabled}>
          <Scissors className="mr-1 h-4 w-4" />
          Create Clip
        </Button>
      )}
    </div>
  )
}

type ZoomControlsProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onFitToClip: () => void
  disabled?: boolean
  className?: string
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onFitToClip,
  disabled,
  className,
}: ZoomControlsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onZoomOut}
        disabled={disabled}
        aria-label="Zoom out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onZoomIn}
        disabled={disabled}
        aria-label="Zoom in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onFit} disabled={disabled}>
        Fit
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onFitToClip} disabled={disabled}>
        Fit to Clip
      </Button>
    </div>
  )
}

type TimeLabelsProps = {
  startTime: number
  currentTime: number
  endTime: number
  duration: number
  clipDuration: number
  /** Optional temp duration (e.g. small selection); shown when provided (spec: "temp duration"). */
  tempDuration?: number | null
  error?: string | null
  isLoading?: boolean
  className?: string
}

export function TimeLabels({
  startTime,
  currentTime,
  endTime,
  duration,
  clipDuration,
  tempDuration,
  error,
  isLoading,
  className,
}: TimeLabelsProps) {
  if (error) {
    return (
      <div className={cn("text-sm text-destructive", className)} role="alert">
        {error}
      </div>
    )
  }
  if (isLoading) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Loading waveform…
      </div>
    )
  }
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums", className)}
      aria-live="polite"
    >
      <span>Start: {formatTime(startTime)}</span>
      <span>Current: {formatTime(currentTime)}</span>
      {tempDuration != null && <span>Temp Duration: {formatTime(tempDuration)}</span>}
      <span>Clip: {formatTime(clipDuration)}</span>
      <span>End: {formatTime(endTime)}</span>
      <span>Duration: {formatTime(duration)}</span>
    </div>
  )
}
