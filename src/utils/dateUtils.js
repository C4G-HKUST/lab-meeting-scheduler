/**
 * Date utility functions for weekly meeting scheduling
 */

/**
 * Get the next Wednesday on or after a given date
 */
export function getNextWednesday(fromDate = new Date()) {
  const date = new Date(fromDate)
  const day = date.getDay()
  const diff = (3 - day + 7) % 7 // 3 = Wednesday
  date.setDate(date.getDate() + diff)
  return date
}

/**
 * Get all Wednesdays between two dates
 */
export function getWednesdays(startDate, count = 20) {
  const dates = []
  const current = getNextWednesday(new Date(startDate))
  for (let i = 0; i < count; i++) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 7)
  }
  return dates
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Format a date for display (e.g., "May 21, 2026")
 */
export function formatDateDisplay(date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date as short display (e.g., "May 21")
 */
export function formatDateShort(date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Check if a date is today
 */
export function isToday(date) {
  const d = new Date(date)
  const today = new Date()
  return formatDate(d) === formatDate(today)
}

/**
 * Check if a date is in the past
 */
export function isPast(date) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/**
 * Check if a date is this week
 */
export function isThisWeek(date) {
  const d = new Date(date)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek
}

/**
 * Get the week number of a date relative to a start date
 */
export function getWeekNumber(date, startDate) {
  const d = new Date(date)
  const s = new Date(startDate)
  const diff = d - s
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}
