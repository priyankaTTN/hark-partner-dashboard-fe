/**
 * Audio Trimmer pure helpers: time formatting, validation, and voice intro normalization.
 */

/** Format seconds to "M:SS" or "H:MM:SS". Returns "—" if invalid. */
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

/** Format seconds to one decimal place (e.g. 12.3). */
export function formatTimeTenths(seconds: number | undefined | null): string {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—"
  const s = Number(seconds)
  if (s < 0) return "—"
  return (Math.round(s * 10) / 10).toFixed(1)
}

/** Clamp value to [min, max]. */
export function keepInRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Validate start/end time range; returns { valid, start, end } with clamped values. */
export function validateTimeRange(
  startTime: number,
  endTime: number,
  duration: number,
  minDuration: number = 20
): { valid: boolean; start: number; end: number } {
  // const minEnd = Math.min(startTime + minDuration, duration)
  // const maxStart = Math.max(0, endTime - minDuration)
  const start = keepInRange(startTime, 0, duration - minDuration)
  const end = keepInRange(endTime, start + minDuration, duration)
  const valid = end - start >= minDuration && start >= 0 && end <= duration
  return { valid, start, end }
}

/** Parse "HH:MM:SS" or "M:SS" to seconds. */
export function timeStringToSeconds(timeStr: string | undefined | null): number {
  if (timeStr == null || typeof timeStr !== "string" || !timeStr.trim()) return 0
  const parts = timeStr.trim().split(":").map((p) => parseInt(p, 10))
  if (parts.some((n) => isNaN(n))) return 0
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

/** Normalize voice intro text (trim, collapse whitespace). */
export function normalizeVoiceIntro(text: string | undefined | null): string {
  if (text == null || typeof text !== "string") return ""
  return text.trim().replace(/\s+/g, " ")
}
