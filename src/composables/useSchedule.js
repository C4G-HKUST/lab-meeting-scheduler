import { ref, computed } from 'vue'
import { readSchedule, writeSchedule } from './useGithubApi'
import { generateSchedule } from '../utils/rotation'
import { formatDate, isPast } from '../utils/dateUtils'

const scheduleData = ref(null)
const scheduleSha = ref(null)
const loading = ref(false)
const error = ref('')
const fullSchedule = ref([])
const hasUnsavedChanges = ref(false)

/**
 * Schedule management composable
 *
 * Architecture: Edit locally → Save all at once
 * - All modifications happen in memory (scheduleData)
 * - Changes are only pushed to GitHub when user clicks "Save"
 */
export function useSchedule() {
  /**
   * Load schedule data from GitHub
   */
  async function loadSchedule() {
    loading.value = true
    error.value = ''
    try {
      const { data, sha } = await readSchedule()
      scheduleData.value = data
      scheduleSha.value = sha
      hasUnsavedChanges.value = false
      // Generate full schedule with auto-rotation
      fullSchedule.value = generateSchedule(data, 30)
    } catch (e) {
      error.value = 'Failed to load schedule data. Please check the repository configuration.'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Save all pending changes to GitHub (with auto-retry on SHA conflict)
   */
  async function saveAllChanges(message = 'Update schedule') {
    if (!scheduleData.value) return
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const newSha = await writeSchedule(scheduleData.value, scheduleSha.value, message)
        scheduleSha.value = newSha
        hasUnsavedChanges.value = false
        // Regenerate schedule
        fullSchedule.value = generateSchedule(scheduleData.value, 30)
        return // success
      } catch (e) {
        if (e.status === 409 && attempt < maxRetries - 1) {
          // SHA conflict - re-fetch latest SHA and retry
          console.warn(`SHA conflict (attempt ${attempt + 1}), re-fetching...`)
          const { sha } = await readSchedule()
          scheduleSha.value = sha
        } else {
          error.value = 'Failed to save changes. Please try again.'
          console.error(e)
          throw e
        }
      }
    }
  }

  /**
   * Mark local data as changed and regenerate schedule view
   */
  function markChanged() {
    hasUnsavedChanges.value = true
    fullSchedule.value = generateSchedule(scheduleData.value, 30)
  }

  /**
   * Discard unsaved changes and reload from GitHub
   */
  async function discardChanges() {
    await loadSchedule()
  }

  /**
   * Get upcoming schedule entries
   */
  const upcomingSchedule = computed(() => {
    return fullSchedule.value.filter(e => !isPast(e.date) || e.status === 'completed')
  })

  /**
   * Get past (completed) schedule entries
   */
  const pastSchedule = computed(() => {
    return fullSchedule.value
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  })

  /**
   * Get member by ID
   */
  function getMember(id) {
    if (!scheduleData.value) return null
    return scheduleData.value.members.find(m => m.id === id)
  }

  /**
   * Skip a week (local only, call saveAllChanges to push)
   */
  function skipWeek(date, reason = '') {
    if (!scheduleData.value) return
    if (!scheduleData.value.skippedDates) {
      scheduleData.value.skippedDates = []
    }
    if (!scheduleData.value.skippedDates.includes(date)) {
      scheduleData.value.skippedDates.push(date)
      scheduleData.value.skippedDates.sort()
    }
    const entry = scheduleData.value.schedule.find(e => e.date === date)
    if (entry) {
      entry.status = 'skipped'
      entry.skipReason = reason
    } else {
      scheduleData.value.schedule.push({
        date,
        presenterId: null,
        status: 'skipped',
        title: '',
        files: [],
        skipReason: reason,
      })
    }
    markChanged()
  }

  /**
   * Unskip a week (local only)
   */
  function unskipWeek(date) {
    if (!scheduleData.value) return
    scheduleData.value.skippedDates = (scheduleData.value.skippedDates || []).filter(d => d !== date)
    const entryIdx = scheduleData.value.schedule.findIndex(e => e.date === date && e.status === 'skipped')
    if (entryIdx !== -1) {
      scheduleData.value.schedule.splice(entryIdx, 1)
    }
    markChanged()
  }

  /**
   * Swap two presenters (local only)
   */
  function swapPresenters(date1, date2) {
    if (!scheduleData.value) return

    // Ensure both dates have schedule entries
    for (const date of [date1, date2]) {
      const existing = scheduleData.value.schedule.find(e => e.date === date)
      if (!existing) {
        const generated = fullSchedule.value.find(e => e.date === date)
        if (generated) {
          scheduleData.value.schedule.push({ ...generated })
        }
      }
    }

    const entry1 = scheduleData.value.schedule.find(e => e.date === date1)
    const entry2 = scheduleData.value.schedule.find(e => e.date === date2)
    if (entry1 && entry2) {
      const tempPresenter = entry1.presenterId
      entry1.presenterId = entry2.presenterId
      entry2.presenterId = tempPresenter
    }
    markChanged()
  }

  /**
   * Add a new member (local only)
   */
  function addMember(name, position) {
    if (!scheduleData.value) return
    const id = 'member_' + Date.now()
    scheduleData.value.members.push({ id, name, email: '' })
    if (position !== undefined && position !== null && position !== '') {
      scheduleData.value.rotation.splice(parseInt(position), 0, id)
    } else {
      scheduleData.value.rotation.push(id)
    }
    markChanged()
  }

  /**
   * Remove a member from rotation (local only)
   */
  function removeMember(memberId) {
    if (!scheduleData.value) return
    scheduleData.value.rotation = scheduleData.value.rotation.filter(id => id !== memberId)
    markChanged()
  }

  /**
   * Mark a presentation as completed (local only)
   */
  function markCompleted(date, title = '') {
    if (!scheduleData.value) return
    let entry = scheduleData.value.schedule.find(e => e.date === date)
    if (!entry) {
      const generated = fullSchedule.value.find(e => e.date === date)
      if (generated) {
        entry = { ...generated }
        scheduleData.value.schedule.push(entry)
      }
    }
    if (entry) {
      entry.status = 'completed'
      if (title) entry.title = title
    }
    markChanged()
  }

  /**
   * Add a file reference to a schedule entry (local only)
   */
  function addFileToEntry(date, filepath) {
    if (!scheduleData.value) return
    let entry = scheduleData.value.schedule.find(e => e.date === date)
    if (!entry) {
      const generated = fullSchedule.value.find(e => e.date === date)
      if (generated) {
        entry = { ...generated }
        scheduleData.value.schedule.push(entry)
      }
    }
    if (entry) {
      if (!entry.files) entry.files = []
      if (!entry.files.includes(filepath)) {
        entry.files.push(filepath)
      }
      entry.status = 'completed'
    }
    markChanged()
  }

  /**
   * Move member in rotation order (local only)
   */
  function moveInRotation(memberId, newIndex) {
    if (!scheduleData.value) return
    const rotation = scheduleData.value.rotation
    const currentIdx = rotation.indexOf(memberId)
    if (currentIdx === -1) return
    rotation.splice(currentIdx, 1)
    rotation.splice(newIndex, 0, memberId)
    markChanged()
  }

  return {
    scheduleData,
    fullSchedule,
    loading,
    error,
    hasUnsavedChanges,
    upcomingSchedule,
    pastSchedule,
    loadSchedule,
    saveAllChanges,
    discardChanges,
    getMember,
    skipWeek,
    unskipWeek,
    swapPresenters,
    addMember,
    removeMember,
    markCompleted,
    addFileToEntry,
    moveInRotation,
  }
}
