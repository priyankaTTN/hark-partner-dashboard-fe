import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date value (string or number) for display; returns "—" if invalid or null. Set includeTime true for date + time. */
export function formatDate(value: string | number | undefined, includeTime?: boolean): string {
  if (value == null) return "—"
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  if (isNaN(date.getTime())) return "—"
  return includeTime ? date.toLocaleString() : date.toLocaleDateString()
}

/** Format duration in seconds to "M:SS" or "H:MM:SS". */
export function formatTime(seconds: number | undefined | null): string {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—"
  const s = Math.floor(Number(seconds))
  if (s < 0) return "—"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${m}:${String(sec).padStart(2, "0")}`
}

/** Format seconds to HH:mm:ss (e.g. 00:00:14). */
export function formatDurationHMS(seconds: number | undefined | null): string {
  if (seconds == null || Number.isNaN(Number(seconds))) return "00:00:00"
  const s = Math.floor(Math.max(0, Number(seconds)))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

/** Clip time: seconds (float) ↔ HH:mm:ss + tenths (0–9). Spec: ANSWERS_DETAIL_COMPONENT_SPEC. */
export function secondsToClipTime(sec: number): { hhmmss: string; tenth: number } {
  const whole = Math.floor(Number(sec) || 0)
  const tenth = Math.max(0, Math.min(9, Math.round(((Number(sec) || 0) - whole) * 10)))
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  const hhmmss = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return { hhmmss, tenth }
}

export function clipTimeToSeconds(hhmmss: string, tenth: number): number {
  const parts = (hhmmss || "00:00:00").trim().split(":").map((p) => parseInt(p, 10) || 0)
  const sec = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  const t = Math.max(0, Math.min(9, tenth || 0))
  return sec + t / 10
}

/** Split seconds into hours, minutes, seconds, tenths for dropdowns. */
export function secondsToHMS(sec: number): { h: number; m: number; s: number; tenth: number } {
  const { hhmmss, tenth } = secondsToClipTime(sec)
  const parts = hhmmss.split(":").map((p) => parseInt(p, 10) || 0)
  return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0, tenth }
}

/** Get visible page numbers for pagination (with ellipsis for long ranges). */
export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = []
  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, "ellipsis", totalPages)
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages)
  }
  return pages
}
