// All dates handled in local timezone. ISO ('YYYY-MM-DD') is the storage/transport
// format; DD-MM-YYYY is used for display per the spec.

export function toISO(d) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISO(new Date())
}

/**
 * Parse a timestamp coming from the backend. The API stores times in UTC but
 * serializes them WITHOUT a timezone marker (e.g. "2026-07-06T09:32:00"). The
 * browser would read that as *local* time, throwing every "x ago" off by the
 * local offset (e.g. a fresh notification showing "5h ago" in IST). So when a
 * datetime has no timezone marker, treat it as UTC by appending "Z".
 */
export function parseServerDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const s = String(value)
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  return new Date(s.includes('T') && !hasTz ? `${s}Z` : s)
}

/** ISO 'YYYY-MM-DD' -> 'DD-MM-YYYY' */
export function ddmmyyyy(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

/** ISO -> 'Wed, 02 Jul 2026' */
export function prettyDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** ISO datetime string -> '02 Jul, 14:30' */
export function prettyDateTime(value) {
  const d = parseServerDate(value)
  if (!d) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ISO datetime string -> '3:45 PM' (submission time, timezone-safe) */
export function timeLabel(value) {
  const d = parseServerDate(value)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function relativeTime(value) {
  const d = parseServerDate(value)
  if (!d) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return prettyDate(toISO(d))
}

// -------------------- time <-> minutes -------------------- //
export function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export function minutesToHHMM(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** minutes-from-midnight -> '9:00 AM' */
export function minutesToLabel(min) {
  let h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  const ap = h >= 12 ? 'PM' : 'AM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

export function hhmmToLabel(hhmm) {
  return minutesToLabel(hhmmToMinutes(hhmm))
}

// -------------------- calendar / escalation -------------------- //
export function isLastDayOfMonth(d = new Date()) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return d.getDate() === last.getDate()
}

/** Mirrors backend rule: pending + (last day of month OR 30+ days old). */
export function canEscalate(status, createdAtISO) {
  if (status !== 'pending') return false
  const now = new Date()
  if (isLastDayOfMonth(now)) return true
  const created = parseServerDate(createdAtISO)
  return created ? (now - created) / 86400000 >= 30 : false
}

/** 6x7 grid of days for a month view. month is 0-indexed. */
export function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay()) // back to Sunday
  const weeks = []
  const cur = new Date(start)
  for (let w = 0; w < 6; w++) {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push({ date: new Date(cur), iso: toISO(cur), inMonth: cur.getMonth() === month })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(days)
  }
  return weeks
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// -------------------- deadline countdown -------------------- //
export function countdownTo(deadlineHHMM, now = new Date()) {
  const [h, m] = String(deadlineHHMM).split(':').map(Number)
  const dl = new Date(now)
  dl.setHours(h, m, 0, 0)
  const diffMs = dl - now
  return { diffMs, passed: diffMs <= 0 }
}

export function formatDuration(ms) {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  if (h <= 0) return `${m} minute${m === 1 ? '' : 's'}`
  return `${h} hour${h === 1 ? '' : 's'} ${m} minute${m === 1 ? '' : 's'}`
}
