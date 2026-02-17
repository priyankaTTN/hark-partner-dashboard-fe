/**
 * Single draggable region overlay for WaveSurfer: start/end handles + draggable body.
 * Attach to WaveSurfer's wrapper; syncs region with onRegionUpdate.
 */
import type WaveSurfer from "wavesurfer.js"
import { keepInRange } from "./utils"

export type RegionState = {
  start: number
  end: number
  current: number
}

export type CustomRegionsPluginOptions = {
  minDuration?: number
  handleSize?: number
  regionColor?: string
  handleColor?: string
  readOnly?: boolean
  onRegionUpdate?: (region: RegionState) => void
}

// const SNAP = 0.1
function snap(t: number): number {
  return Math.round(t * 10) / 10
}

export class CustomRegionsPlugin {
  private wavesurfer: WaveSurfer
  private options: Required<Omit<CustomRegionsPluginOptions, "onRegionUpdate">> & {
    onRegionUpdate?: (region: RegionState) => void
  }
  private region: RegionState | null = null
  private regionsContainer: HTMLDivElement | null = null
  private highlightEl: HTMLDivElement | null = null
  private startHandleEl: HTMLDivElement | null = null
  private endHandleEl: HTMLDivElement | null = null
  private isDragging = false
  private dragHandle: "start" | "end" | "region" | null = null
  private dragStartTime = 0
  private dragStartX = 0
  private unsubscribes: Array<() => void> = []
  private interactRestoreTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    wavesurfer: WaveSurfer,
    _containerElement: HTMLElement,
    options: CustomRegionsPluginOptions = {}
  ) {
    this.wavesurfer = wavesurfer
    this.options = {
      minDuration: options.minDuration ?? 20,
      handleSize: options.handleSize ?? 12,
      regionColor: options.regionColor ?? "rgba(30, 136, 229, 0.3)",
      handleColor: options.handleColor ?? "#1e88e5",
      readOnly: options.readOnly ?? false,
      onRegionUpdate: options.onRegionUpdate,
    }
  }

  private getDuration(): number {
    return this.wavesurfer.getDuration() || 0
  }

  /** Convert client X (screen coord) to time in seconds. Spec: use getBoundingClientRect of regionsContainer. */
  private pixelToTime(clientX: number): number {
    if (!this.regionsContainer) return 0
    const duration = this.getDuration()
    if (duration <= 0) return 0
    const rect = this.regionsContainer.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percentage = rect.width > 0 ? relativeX / rect.width : 0
    return keepInRange(percentage * duration, 0, duration)
  }

  private renderPosition(): void {
    if (!this.region || !this.highlightEl || !this.regionsContainer) return
    const duration = this.getDuration()
    if (duration <= 0) return
    const left = (this.region.start / duration) * 100
    const right = ((duration - this.region.end) / duration) * 100
    this.highlightEl.style.left = `${left}%`
    this.highlightEl.style.right = `${right}%`
  }

  private updateStartTime(newStart: number): void {
    if (!this.region) return
    const duration = this.getDuration()
    const minDuration = this.options.minDuration
    const start = keepInRange(snap(newStart), 0, Math.max(0, this.region.end - minDuration))
    const end = Math.min(this.region.end, duration)
    if (end - start >= minDuration) {
      this.region.start = start
      this.region.current = start
      this.renderPosition()
      this.options.onRegionUpdate?.(this.region)
    }
  }

  private updateEndTime(newEnd: number): void {
    if (!this.region) return
    const duration = this.getDuration()
    const minDuration = this.options.minDuration
    const end = keepInRange(
      snap(newEnd),
      this.region.start + minDuration,
      duration
    )
    if (end - this.region.start >= minDuration) {
      this.region.end = end
      this.renderPosition()
      this.options.onRegionUpdate?.(this.region)
    }
  }

  private moveRegion(deltaTime: number): void {
    if (!this.region) return
    const duration = this.getDuration()
    const len = this.region.end - this.region.start
    let start = this.region.start + deltaTime
    start = keepInRange(start, 0, duration - len)
    const end = start + len
    this.region.start = snap(start)
    this.region.end = snap(end)
    this.region.current = this.region.start
    this.renderPosition()
    this.options.onRegionUpdate?.(this.region)
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.options.readOnly || !this.region) return
    const target = e.target as HTMLElement
    this.dragStartX = e.clientX
    if (target.dataset.handle === "start") {
      this.dragHandle = "start"
      this.dragStartTime = this.region.start
    } else if (target.dataset.handle === "end") {
      this.dragHandle = "end"
      this.dragStartTime = this.region.end
    } else if (target.classList.contains("region-highlight")) {
      this.dragHandle = "region"
      this.dragStartTime = this.region.start
    } else return
    e.preventDefault()
    this.isDragging = true
    if (this.highlightEl) this.highlightEl.style.cursor = "grabbing"
    this.wavesurfer.toggleInteraction?.(false)
    document.addEventListener("mousemove", this.onMouseMove)
    document.addEventListener("mouseup", this.onMouseUp)
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.region) return
    if (this.dragHandle === "start") {
      const deltaTime = this.pixelToTime(e.clientX) - this.pixelToTime(this.dragStartX)
      this.updateStartTime(this.dragStartTime + deltaTime)
    } else if (this.dragHandle === "end") {
      const deltaTime = this.pixelToTime(e.clientX) - this.pixelToTime(this.dragStartX)
      this.updateEndTime(this.dragStartTime + deltaTime)
    } else if (this.dragHandle === "region") {
      const deltaTime = this.pixelToTime(e.clientX) - this.pixelToTime(this.dragStartX)
      this.moveRegion(deltaTime)
      this.dragStartX = e.clientX
    }
  }

  private onMouseUp = (): void => {
    if (!this.isDragging) return
    this.isDragging = false
    this.dragHandle = null
    if (this.highlightEl) this.highlightEl.style.cursor = this.options.readOnly ? "default" : "grab"
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("mouseup", this.onMouseUp)
    if (this.region) this.options.onRegionUpdate?.(this.region)
    if (this.interactRestoreTimeout) clearTimeout(this.interactRestoreTimeout)
    this.interactRestoreTimeout = setTimeout(() => {
      this.wavesurfer.toggleInteraction?.(true)
      this.interactRestoreTimeout = null
    }, 50)
  }

  createRegion(startTime: number, endTime: number): RegionState | null {
    const duration = this.getDuration()
    const minDuration = this.options.minDuration
    if (duration <= 0) return null
    const start = keepInRange(snap(startTime), 0, duration - minDuration)
    const end = keepInRange(snap(endTime), start + minDuration, duration)
    if (end - start < minDuration) return null

    this.removeRegion()
    this.region = { start, end, current: start }

    const wrapper = this.wavesurfer.getWrapper()
    if (!wrapper) return null

    this.regionsContainer = document.createElement("div")
    this.regionsContainer.style.cssText =
      "position:absolute;inset:0;z-index:5;pointer-events:none;"
    wrapper.appendChild(this.regionsContainer)

    this.highlightEl = document.createElement("div")
    this.highlightEl.className = "region-highlight"
    this.highlightEl.style.cssText = `position:absolute;top:0;bottom:0;background:${this.options.regionColor};border:2px solid ${this.options.handleColor};pointer-events:auto;cursor:${this.options.readOnly ? "default" : "grab"};box-sizing:border-box;`
    if (!this.options.readOnly) {
      this.highlightEl.addEventListener("mousedown", this.onMouseDown as EventListener)
    }

    if (!this.options.readOnly) {
      this.startHandleEl = document.createElement("div")
      this.startHandleEl.dataset.handle = "start"
      this.startHandleEl.style.cssText = `position:absolute;left:0;top:50%;transform:translate(-50%,-50%);width:${this.options.handleSize}px;height:${this.options.handleSize}px;border-radius:50%;background:${this.options.handleColor};border:2px solid white;cursor:ew-resize;pointer-events:auto;z-index:12;box-shadow:0 2px 4px rgba(0,0,0,0.2);`
      this.startHandleEl.addEventListener("mousedown", this.onMouseDown as EventListener)

      this.endHandleEl = document.createElement("div")
      this.endHandleEl.dataset.handle = "end"
      this.endHandleEl.style.cssText = `position:absolute;right:0;top:50%;transform:translate(50%,-50%);width:${this.options.handleSize}px;height:${this.options.handleSize}px;border-radius:50%;background:${this.options.handleColor};border:2px solid white;cursor:ew-resize;pointer-events:auto;z-index:12;box-shadow:0 2px 4px rgba(0,0,0,0.2);`
      this.endHandleEl.addEventListener("mousedown", this.onMouseDown as EventListener)

      this.highlightEl.appendChild(this.startHandleEl)
      this.highlightEl.appendChild(this.endHandleEl)
    }

    this.regionsContainer.appendChild(this.highlightEl)
    this.renderPosition()

    const unRedraw = this.wavesurfer.on("redraw", () => this.renderPosition())
    const unZoom = this.wavesurfer.on("zoom", () => this.renderPosition())
    const unScroll = this.wavesurfer.on("scroll", () => this.renderPosition())
    this.unsubscribes.push(unRedraw, unZoom, unScroll)

    return this.region
  }

  getRegion(): RegionState | null {
    return this.region
  }

  setRegion(startTime: number, endTime: number): RegionState | null {
    return this.createRegion(startTime, endTime)
  }

  removeRegion(): void {
    this.unsubscribes.forEach((fn) => fn())
    this.unsubscribes = []
    if (this.interactRestoreTimeout) {
      clearTimeout(this.interactRestoreTimeout)
      this.interactRestoreTimeout = null
    }
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("mouseup", this.onMouseUp)
    if (this.regionsContainer?.parentNode) {
      this.regionsContainer.parentNode.removeChild(this.regionsContainer)
    }
    this.regionsContainer = null
    this.highlightEl = null
    this.startHandleEl = null
    this.endHandleEl = null
    this.region = null
  }

  destroy(): void {
    this.removeRegion()
    this.wavesurfer = null as unknown as WaveSurfer
  }
}
