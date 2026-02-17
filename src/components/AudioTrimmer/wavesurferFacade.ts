/**
 * WaveSurfer config and CustomRegionsPlugin factory.
 * Spec: scroll/fill/auto options, Timeline plugin, initial fit (minPxPerSec from container width).
 */
import WaveSurfer from "wavesurfer.js"
import type { WaveSurferOptions } from "wavesurfer.js"
// Timeline plugin: time ruler below waveform (spec: load after WaveSurfer, formatTimeCallback)
import TimelinePlugin from "wavesurfer.js/plugins/timeline"
import { CustomRegionsPlugin } from "./CustomRegionsPlugin"
import type { CustomRegionsPluginOptions, RegionState } from "./CustomRegionsPlugin"
import { formatTime } from "./utils"

const DEFAULT_HEIGHT = 128
const DEFAULT_MIN_PX_PER_SEC = 50
const CONTAINER_PADDING_PX = 30

export function getWaveSurferConfig(
  container: HTMLElement,
  options: {
    audioUrl: string
    height?: number
    minPxPerSec?: number
    peaksUrl?: string | null
    peaks?: Array<Float32Array | number[]> | null
    duration?: number
    /** Container width for initial fit (spec: minPxPerSec = (containerWidth - 30) / duration). */
    containerWidth?: number
  }
): WaveSurferOptions {
  const height = options.height ?? DEFAULT_HEIGHT
  const duration = options.duration ?? 0
  const containerWidth = options.containerWidth ?? container.clientWidth ?? 0
  const initialFitPx =
    duration > 0 && containerWidth > CONTAINER_PADDING_PX
      ? (containerWidth - CONTAINER_PADDING_PX) / duration
      : undefined
  const minPxPerSec = options.minPxPerSec ?? initialFitPx ?? DEFAULT_MIN_PX_PER_SEC

  const config: WaveSurferOptions & { scrollParent?: boolean } = {
    container,
    height,
    waveColor: "#2d3548",
    progressColor: "#3d4659",
    cursorColor: "#FFC107",
    cursorWidth: 2,
    minPxPerSec,
    fillParent: false,
    interact: true,
    dragToSeek: true,
    hideScrollbar: true,
    autoScroll: false,
    autoCenter: false,
    scrollParent: true,
    url: options.audioUrl,
    plugins: [
      TimelinePlugin.create({
        height: 20,
        formatTimeCallback: (seconds) => formatTime(seconds),
      }),
    ],
  }
  if (options.peaks?.length) {
    config.peaks = options.peaks
    if (options.duration != null) config.duration = options.duration
  }
  return config as WaveSurferOptions
}

export function createRegionsPlugin(
  wavesurfer: WaveSurfer,
  containerElement: HTMLElement,
  pluginOptions?: CustomRegionsPluginOptions
): CustomRegionsPlugin {
  return new CustomRegionsPlugin(wavesurfer, containerElement, pluginOptions)
}

export type { CustomRegionsPlugin, CustomRegionsPluginOptions, RegionState }
