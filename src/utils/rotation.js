/**
 * Auto-rotation logic for generating meeting schedules
 */

import { getWednesdays, formatDate } from './dateUtils.js'

/**
 * Generate a schedule based on the rotation list and existing data
 *
 * @param {Object} scheduleData - The full schedule data object
 * @param {number} weeksAhead - How many weeks ahead to generate
 * @returns {Array} - Array of schedule entries (merged existing + generated)
 */
export function generateSchedule(scheduleData, weeksAhead = 20) {
  const { settings, members, rotation, schedule, skippedDates = [] } = scheduleData

  // Get all meeting dates
  const startDate = settings.startDate || formatDate(new Date())
  const meetingDates = getWednesdays(startDate, weeksAhead + schedule.length)

  // Create a map of existing schedule entries by date
  const existingMap = new Map()
  schedule.forEach(entry => {
    existingMap.set(entry.date, entry)
  })

  // Create a member lookup
  const memberMap = new Map()
  members.forEach(m => memberMap.set(m.id, m))

  // Generate the full schedule
  const fullSchedule = []
  let rotationIndex = 0

  // Determine where we left off in the rotation
  // Count completed/upcoming entries to find current rotation position
  const manualEntries = new Set()
  schedule.forEach(entry => {
    if (entry.presenterId) {
      manualEntries.add(entry.date)
    }
  })

  for (const date of meetingDates) {
    const dateStr = formatDate(date)

    // Check if this date is skipped
    if (skippedDates.includes(dateStr)) {
      fullSchedule.push({
        date: dateStr,
        presenterId: null,
        status: 'skipped',
        title: '',
        files: [],
      })
      continue
    }

    // Check if there's an existing entry for this date
    if (existingMap.has(dateStr)) {
      fullSchedule.push(existingMap.get(dateStr))
      // Advance rotation if this was a scheduled presentation
      const entry = existingMap.get(dateStr)
      if (entry.presenterId && entry.status !== 'skipped') {
        // Find this presenter in rotation and advance past them
        const idx = rotation.indexOf(entry.presenterId)
        if (idx !== -1) {
          rotationIndex = (idx + 1) % rotation.length
        }
      }
      continue
    }

    // Generate a new entry from rotation
    if (rotation.length > 0) {
      const presenterId = rotation[rotationIndex % rotation.length]
      fullSchedule.push({
        date: dateStr,
        presenterId,
        status: 'upcoming',
        title: '',
        files: [],
      })
      rotationIndex = (rotationIndex + 1) % rotation.length
    }
  }

  return fullSchedule
}

/**
 * Swap two schedule entries by their dates
 */
export function swapEntries(schedule, date1, date2) {
  const idx1 = schedule.findIndex(e => e.date === date1)
  const idx2 = schedule.findIndex(e => e.date === date2)
  if (idx1 === -1 || idx2 === -1) return schedule

  const newSchedule = [...schedule]
  // Swap presenters and titles (keep dates and files)
  const temp = {
    presenterId: newSchedule[idx1].presenterId,
    title: newSchedule[idx1].title,
  }
  newSchedule[idx1].presenterId = newSchedule[idx2].presenterId
  newSchedule[idx1].title = newSchedule[idx2].title
  newSchedule[idx2].presenterId = temp.presenterId
  newSchedule[idx2].title = temp.title

  return newSchedule
}

/**
 * Insert a new member into the rotation at a specific position
 */
export function insertIntoRotation(rotation, memberId, position) {
  const newRotation = [...rotation]
  if (position === undefined || position >= newRotation.length) {
    newRotation.push(memberId)
  } else {
    newRotation.splice(position, 0, memberId)
  }
  return newRotation
}

/**
 * Remove a member from the rotation
 */
export function removeFromRotation(rotation, memberId) {
  return rotation.filter(id => id !== memberId)
}
