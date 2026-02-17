/**
 * Audio Trimmer: WaveSurfer waveform + draggable clip region + playback/zoom + optional Create Clip modal.
 * Spec: AUDIO_TRIMMER_COMPONENT_SPEC.md — ref API (seekAndPlay), props, Create Clip payload, lifecycle.
 */
import * as React from "react"
import WaveSurfer from "wavesurfer.js"
import {
  getWaveSurferConfig,
  createRegionsPlugin,
  type CustomRegionsPlugin,
} from "./wavesurferFacade"
import { timeStringToSeconds, validateTimeRange } from "./utils"
import {
  WaveformContainer,
  PlaybackControlsViewOnly,
  PlaybackControls,
  ZoomControls,
  TimeLabels,
} from "./TrimmerControls"
import { CreateClipModal, type CreateClipModalType } from "./CreateClipModal"
import { uploadIntroOutroOrImage } from "@/lib/api"

const MIN_DURATION = 20
const DEFAULT_MIN_PX = 50
const FIT_MIN_PX = 20

export type ActiveClip = {
  startTime?: number
  endTime?: number
  title?: string
  description?: string
  [key: string]: unknown
}

export type AudioTrimmerProps = {
  /** Single audio URL (spec: Audio). */
  audioUrl?: string
  /** If present, first element is used (spec: Audio). */
  audioUrls?: string[]
  /** Duration in seconds or time string e.g. "HH:MM:SS" (spec: Audio). */
  duration?: number | string
  /** Optional precomputed peaks JSON URL for instant waveform (spec: Audio). */
  peaksUrl?: string
  /** Initial or external clip range and metadata (spec: Trim). */
  activeClip?: ActiveClip | null
  /** Notify parent when trim range changes (spec: Trim). */
  onTrimChange?: (startTime: number, endTime: number) => void
  /** Called when user submits Create Clip with full payload (spec: Create clip). */
  addNewClipInfo?: (payload: Record<string, unknown>) => void
  showCreateClipButton?: boolean
  searchHarkList?: (
    params: { playlistqs: string; type: string },
    callback: (data: { results?: unknown[]; dictionary?: unknown }) => void
  ) => void
  user?: { uid: string; name: string }
  episodeData?: Record<string, unknown>
  fetchAllTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  fetchGenreTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  fetchToneTags?: (params: { limit: number }, callback: (list: Array<{ _id: string; name: string }>) => void) => void
  viewOnly?: boolean
  hideEditingControls?: boolean
  hidePlayControl?: boolean
  isAudioPlay?: boolean
  isAutoPlay?: boolean
  onCurrentTimeUpdate?: (currentTime: number) => void
  /** Called when play/pause state changes (for transcript sync). */
  onPlayStateChange?: (isPlaying: boolean) => void
  type?: CreateClipModalType
  /** Upload intro loading callbacks (spec: Loading / Loaded / S3UploadData). */
  onLoading?: () => void
  onLoaded?: () => void
  onS3UploadData?: (data: { location?: string }) => void
  /** Optional temp duration for TimeLabels (spec: temp duration). */
  tempDuration?: number | null
  className?: string
}

/** Ref API (spec: prefer seekAndPlay for "play from here"; getWavesurfer optional for advanced use). */
export interface AudioTrimmerRef {
  /** Seek to time (seconds) and start playback. Use when transcript or other UI wants to play from here. */
  seekAndPlay: (time: number) => void
  /** Optional: expose WaveSurfer instance for advanced cases (e.g. custom audioprocess). */
  getWavesurfer?: () => WaveSurfer | null
}

function getAudioUrl(props: AudioTrimmerProps): string | undefined {
  if (props.audioUrl) return props.audioUrl
  if (props.audioUrls?.length) return props.audioUrls[0]
  return undefined
}

function getDurationSeconds(props: AudioTrimmerProps): number {
  const d = props.duration
  if (d == null) return 0
  if (typeof d === "number") return d
  return timeStringToSeconds(String(d))
}

export const AudioTrimmer = React.forwardRef<AudioTrimmerRef, AudioTrimmerProps>(
  function AudioTrimmer(props, ref) {
    const {
      activeClip,
      onTrimChange,
      addNewClipInfo,
      showCreateClipButton,
      searchHarkList,
      user,
      episodeData,
      fetchAllTags,
      fetchGenreTags,
      fetchToneTags,
      viewOnly = false,
      hideEditingControls = false,
      hidePlayControl = false,
      isAudioPlay,
      isAutoPlay,
      onCurrentTimeUpdate,
      onPlayStateChange,
      type,
      onLoading,
      onLoaded,
      onS3UploadData,
      tempDuration,
      className,
    } = props

    const containerRef = React.useRef<HTMLDivElement>(null)
    const wavesurferRef = React.useRef<WaveSurfer | null>(null)
    const regionsPluginRef = React.useRef<CustomRegionsPlugin | null>(null)
    const isMountedRef = React.useRef(true)
    const initGuardRef = React.useRef(false)

    const [isPlaying, setIsPlaying] = React.useState(false)
    const [currentTime, setCurrentTime] = React.useState(0)
    const [duration, setDuration] = React.useState(0)
    const [startTime, setStartTime] = React.useState(0)
    const [endTime, setEndTime] = React.useState(MIN_DURATION)
    const [error, setError] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isReady, setIsReady] = React.useState(false)
    const [showModal, setShowModal] = React.useState(false)
    const [playbackRate, setPlaybackRate] = React.useState(1)
    const [minPxPerSec, setMinPxPerSec] = React.useState(DEFAULT_MIN_PX)
    const wasPlayingBeforeModalRef = React.useRef(false)

    const audioUrl = getAudioUrl(props)
    const peaksUrl = props.peaksUrl
    const propDuration = getDurationSeconds(props)

    const safeSetState = React.useCallback(
      <S,>(setter: React.Dispatch<React.SetStateAction<S>>, value: NoInfer<S>) => {
        if (isMountedRef.current) setter(value)
      },
      []
    )

    const onRegionUpdate = React.useCallback(
      (region: { start: number; end: number }) => {
        safeSetState(setStartTime, region.start)
        safeSetState(setEndTime, region.end)
        onTrimChange?.(region.start, region.end)
      },
      [onTrimChange, safeSetState]
    )

    React.useEffect(() => {
      isMountedRef.current = true
      return () => {
        isMountedRef.current = false
      }
    }, [])

    React.useEffect(() => {
      if (!audioUrl || !containerRef.current) return
      if (initGuardRef.current) return
      initGuardRef.current = true
      safeSetState(setError, null)
      safeSetState(setIsLoading, true)
      safeSetState(setIsReady, false)

      let cancelled = false
      let teardown: (() => void) | undefined
      let zoomTimeoutId: ReturnType<typeof setTimeout> | undefined
      const container = containerRef.current

      const initWaveSurfer = (peaksData?: Array<Float32Array | number[]> | null): void => {
        if (cancelled) return
        container.innerHTML = ""
        const containerWidth = container.clientWidth || 0
        const config = getWaveSurferConfig(container, {
          audioUrl,
          height: 80,
          duration: propDuration || undefined,
          containerWidth,
          peaks: peaksData ?? undefined,
        })

        const ws = WaveSurfer.create(config)
        wavesurferRef.current = ws

        const unReady = ws.on("ready", (dur) => {
          if (cancelled) return
          const d = Number(dur) || propDuration || 0
          safeSetState(setDuration, d)
          safeSetState(setIsLoading, false)
          safeSetState(setIsReady, true)
          const start = activeClip?.startTime ?? 0
          const end = activeClip?.endTime ?? Math.max(MIN_DURATION, d - 1)
          const { start: s, end: e } = validateTimeRange(start, end, d, MIN_DURATION)
          safeSetState(setStartTime, s)
          safeSetState(setEndTime, e)
          const plugin = createRegionsPlugin(ws, container, {
            minDuration: MIN_DURATION,
            readOnly: !!viewOnly,
            onRegionUpdate: (r) => onRegionUpdate(r),
          })
          regionsPluginRef.current = plugin
          plugin.createRegion(s, e)
          onTrimChange?.(s, e)
          safeSetState(setCurrentTime, 0)
          onCurrentTimeUpdate?.(0)
          if (d > 0 && container.clientWidth > 30) {
            const optimalZoom = (container.clientWidth - 30) / d
            ws.zoom(optimalZoom)
            safeSetState(setMinPxPerSec, optimalZoom)
          }
          zoomTimeoutId = setTimeout(() => {
            if (cancelled) return
            if (d > 0 && container.clientWidth > 30) {
              const optimalZoom = (container.clientWidth - 30) / d
              ws.zoom(optimalZoom)
              safeSetState(setMinPxPerSec, optimalZoom)
            }
          }, 200)
          if (isAutoPlay ?? isAudioPlay) {
            ws.play(s, e).catch(() => {})
            safeSetState(setIsPlaying, true)
          }
        })

        const unError = ws.on("error", (err) => {
          if (!cancelled) {
            safeSetState(setError, err?.message ?? "Failed to load audio")
            safeSetState(setIsLoading, false)
          }
        })

        const unTimeupdate = ws.on("timeupdate", (t) => {
          if (!cancelled) {
            safeSetState(setCurrentTime, t)
            onCurrentTimeUpdate?.(t)
          }
        })

        const notifyPlayState = (playing: boolean) => {
          if (!cancelled) {
            safeSetState(setIsPlaying, playing)
            onPlayStateChange?.(playing)
          }
        }
        const unPlay = ws.on("play", () => notifyPlayState(true))
        const unPause = ws.on("pause", () => notifyPlayState(false))
        const unFinish = ws.on("finish", () => notifyPlayState(false))

        teardown = () => {
          if (zoomTimeoutId != null) clearTimeout(zoomTimeoutId)
          unReady()
          unError()
          unTimeupdate()
          unPlay()
          unPause()
          unFinish()
          regionsPluginRef.current?.destroy()
          regionsPluginRef.current = null
          wavesurferRef.current?.destroy()
          wavesurferRef.current = null
        }
      }

      if (peaksUrl) {
        fetch(peaksUrl, { headers: { Accept: "application/json" } })
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load peaks"))))
          .then((json) => {
            if (cancelled) return
            // Spec: expected shape { peaks: number[] | number[][], duration?, source?, version? }; fallback to normal load if no peaks array
            const raw = json?.peaks ?? json?.data ?? json
            if (!raw || !Array.isArray(raw)) {
              if (!cancelled) initWaveSurfer(null)
              return
            }
            const peaks: Array<Float32Array> =
              raw.length > 0 && Array.isArray(raw[0])
                ? (raw as number[][]).map((ch) => new Float32Array(ch))
                : [new Float32Array(raw as number[])]
            const peaksArray = peaks.length ? peaks : undefined
            initWaveSurfer(peaksArray as Array<Float32Array | number[]> | undefined)
          })
          .catch(() => {
            if (!cancelled) initWaveSurfer(null)
          })
      } else {
        initWaveSurfer(null)
      }

      return () => {
        cancelled = true
        initGuardRef.current = false
        teardown?.()
      }
    }, [audioUrl, peaksUrl, safeSetState, onRegionUpdate, onTrimChange, onCurrentTimeUpdate, onPlayStateChange, isAutoPlay, isAudioPlay, propDuration, viewOnly])

    React.useEffect(() => {
      if (!isReady || !activeClip) return
      const s = activeClip.startTime ?? startTime
      const e = activeClip.endTime ?? endTime
      const { start, end } = validateTimeRange(s, e, duration, MIN_DURATION)
      regionsPluginRef.current?.removeRegion()
      regionsPluginRef.current?.createRegion(start, end)
      safeSetState(setStartTime, start)
      safeSetState(setEndTime, end)
      onTrimChange?.(start, end)
    }, [activeClip?.startTime, activeClip?.endTime, duration, isReady, onTrimChange, safeSetState])

    React.useImperativeHandle(
      ref,
      () => ({
        seekAndPlay(time: number) {
          const ws = wavesurferRef.current
          if (!ws) return
          ws.setTime(time)
          ws.play(time, endTime).catch(() => {})
          safeSetState(setCurrentTime, time)
          safeSetState(setIsPlaying, true)
        },
        getWavesurfer: () => wavesurferRef.current,
      }),
      [endTime, safeSetState]
    )

    const handlePlayPause = React.useCallback(() => {
      const ws = wavesurferRef.current
      if (!ws) return
      if (isPlaying) ws.pause()
      else ws.play(startTime, endTime).catch(() => {})
    }, [isPlaying, startTime, endTime])

    const handleSetStart = React.useCallback(() => {
      const ct = currentTime
      const end = Math.max(endTime, ct + MIN_DURATION)
      regionsPluginRef.current?.setRegion(ct, end)
      setStartTime(ct)
      setEndTime(end)
      onTrimChange?.(ct, end)
    }, [currentTime, endTime, onTrimChange])

    const handleSetEnd = React.useCallback(() => {
      const ct = currentTime
      const start = Math.min(startTime, Math.max(0, ct - MIN_DURATION))
      regionsPluginRef.current?.setRegion(start, ct)
      setStartTime(start)
      setEndTime(ct)
      onTrimChange?.(start, ct)
    }, [currentTime, startTime, onTrimChange])

    const handleGoToStart = React.useCallback(() => {
      wavesurferRef.current?.setTime(startTime)
      setCurrentTime(startTime)
    }, [startTime])

    const handleZoomIn = React.useCallback(() => {
      const next = Math.min(minPxPerSec * 1.5, 500)
      setMinPxPerSec(next)
      wavesurferRef.current?.zoom(next)
    }, [minPxPerSec])

    const handleZoomOut = React.useCallback(() => {
      const next = Math.max(minPxPerSec / 1.5, 10)
      setMinPxPerSec(next)
      wavesurferRef.current?.zoom(next)
    }, [minPxPerSec])

    const handleFit = React.useCallback(() => {
      if (!containerRef.current || !duration) return
      const w = containerRef.current.clientWidth
      const next = w / duration
      setMinPxPerSec(next)
      wavesurferRef.current?.zoom(next)
    }, [duration])

    const handleFitToClip = React.useCallback(() => {
      if (!containerRef.current) return
      const len = endTime - startTime
      if (len <= 0) return
      const w = containerRef.current.clientWidth
      const next = Math.max(FIT_MIN_PX, w / len)
      setMinPxPerSec(next)
      wavesurferRef.current?.zoom(next)
      wavesurferRef.current?.setScrollTime(startTime)
    }, [startTime, endTime])

    React.useEffect(() => {
      const ws = wavesurferRef.current
      if (!ws) return
      ws.setPlaybackRate(playbackRate)
    }, [playbackRate])

    const openModal = React.useCallback(() => {
      wasPlayingBeforeModalRef.current = isPlaying
      if (isPlaying) wavesurferRef.current?.pause()
      setShowModal(true)
    }, [isPlaying])

    const closeModal = React.useCallback(() => {
      setShowModal(false)
      if (wasPlayingBeforeModalRef.current) wavesurferRef.current?.play(startTime, endTime).catch(() => {})
    }, [startTime, endTime])

    const handleResumeAudio = React.useCallback(() => {
      closeModal()
      wavesurferRef.current?.play(startTime, endTime).catch(() => {})
    }, [closeModal, startTime, endTime])

    if (!audioUrl) {
      return (
        <div className={className}>
          <p className="text-sm text-muted-foreground">No audio URL provided.</p>
        </div>
      )
    }

    return (
      <div className={className}>
        <CreateClipModal
          isOpen={showModal}
          onToggle={setShowModal}
          startTime={startTime}
          endTime={endTime}
          mainAudioUrl={audioUrl}
          activeClip={activeClip ?? undefined}
          episodeData={episodeData}
          user={user}
          type={type}
          addNewClipInfo={addNewClipInfo ?? (() => {})}
          searchHarkList={searchHarkList}
          fetchAllTags={fetchAllTags}
          fetchGenreTags={fetchGenreTags}
          fetchToneTags={fetchToneTags}
          onResumeAudio={handleResumeAudio}
          onLoading={onLoading}
          onLoaded={onLoaded}
          onS3UploadData={onS3UploadData}
          uploadIntro={uploadIntroOutroOrImage}
        />
        <WaveformContainer ref={containerRef} />
        {viewOnly ? (
          !hidePlayControl && (
            <PlaybackControlsViewOnly
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              currentTime={currentTime}
              duration={duration}
              disabled={!isReady}
            />
          )
        ) : (
          <>
            {!hidePlayControl && (
              <PlaybackControls
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                playbackRate={playbackRate}
                onPlaybackRateChange={setPlaybackRate}
                onSetStart={handleSetStart}
                onSetEnd={handleSetEnd}
                onGoToStart={handleGoToStart}
                onCreateClip={openModal}
                showCreateClipButton={showCreateClipButton}
                disabled={!isReady}
              >
                {!hideEditingControls && (
                  <ZoomControls
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onFit={handleFit}
                    onFitToClip={handleFitToClip}
                    disabled={!isReady}
                  />
                )}
              </PlaybackControls>
            )}
          </>
        )}
        <TimeLabels
          startTime={startTime}
          currentTime={currentTime}
          endTime={endTime}
          duration={duration}
          clipDuration={Math.max(0, endTime - startTime)}
          tempDuration={tempDuration}
          error={error}
          isLoading={isLoading}
          className="mt-2"
        />
      </div>
    )
  }
)

export default AudioTrimmer
export { formatTime, formatTimeTenths, keepInRange, validateTimeRange, timeStringToSeconds, normalizeVoiceIntro } from "./utils"
export type { CustomRegionsPluginOptions, RegionState } from "./CustomRegionsPlugin"
export type { CreateClipModalType } from "./CreateClipModal"
