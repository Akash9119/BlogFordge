/** Formatters for everything that renders in the mono "measured data" face. */

const DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

/** "04 Aug 2026" */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE.format(date).toUpperCase()
}

/** "04 Aug 2026, 14:32" */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME.format(date).toUpperCase()
}

/** "14:32" — toast timestamps. */
export function formatTime(value: Date = new Date()): string {
  return TIME.format(value)
}

/** Relative for the last week, absolute after that. Comments, activity. */
export function formatRelative(value?: string | Date | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(date)
}

/** 12345 → "12,345"; 1200000 → "1.2M" once past six figures. */
export function formatCount(value = 0): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return value.toLocaleString('en-GB')
}

export function formatBytes(bytes = 0): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatReadingTime(minutes = 1): string {
  return `${Math.max(1, minutes)} MIN READ`
}

/** ISO date (YYYY-MM-DD) — what the analytics endpoints expect. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

/**
 * Mirrors Backend/src/utils/slug so the editor can show the slug the API will
 * generate before it saves. The server still owns uniqueness (`-2` suffixes).
 */
export function previewSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
