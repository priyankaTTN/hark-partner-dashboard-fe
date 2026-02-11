import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date value (string or number) for display; returns "—" if invalid or null. */
export function formatDate(value: string | number | undefined): string {
  if (value == null) return "—"
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
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
