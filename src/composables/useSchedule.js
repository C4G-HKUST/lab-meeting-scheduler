import { ref, computed } from 'vue'
import { readSchedule, writeSchedule } from './useGithubApi'
import { generateSchedule } from '../utils/rotation'
import { formatDate, isPast } from '../utils/dateUtils'

const scheduleData = ref(null)
const scheduleSha = ref(null)
const loading = ref(false)
const error = ref('')
const fullSchedule = ref([])

/**
 * Schedule management composable
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
   * Save schedule data to GitHub (with auto-retry on SHA conflict)
   */
  async function saveSchedule(message = 'Update schedule') {
    if (!scheduleData.value) return
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const newSha = await writeSchedule(scheduleData.value, scheduleSha.value, message)
        scheduleSha.value = newSha
        // Regenerate schedule
        fullSchedule.value = generateSchedule(scheduleData.value, 30)
        return // success
      } catch (e) {
        if (e.status === 409 && attempt < maxRetries - 1) {
          // SHA conflict - re-fetch latest SHA and retry
          console.warn(`SHA conflict (attempt ${attempt + 1}), re-fetching...`)
          const { data, sha } = await readSchedule()
          scheduleSha.value = sha
          // Merge: keep our local changes but use the new SHA
          // (our scheduleData.value already has the desired state)
        } else {
          error.value = 'Failed to save changes. Please try again.'
          console.error(e)
          throw e
        }
      }
    }
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
   * Skip a week
   */
  async function skipWeek(date, reason = '') {
    if (!scheduleData.value) return
    if (!scheduleData.value.skippedDates) {
      scheduleData.value.skippedDates = []
    }
    if (!scheduleData.value.skippedDates.includes(date)) {
      scheduleData.value.skippedDates.push(date)
      scheduleData.value.skippedDates.sort()
    }
    // Also update the schedule entry if it exists
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
    await saveSchedule(`Skip meeting on ${date}${reason ? ': ' + reason : ''}`)
  }

  /**
   * Unskip a week
   */
  async function unskipWeek(date) {
    if (!scheduleData.value) return
    scheduleData.value.skippedDates = (scheduleData.value.skippedDates || []).filter(d => d !== date)
    const entryIdx = scheduleData.value.schedule.findIndex(e => e.date === date && e.status === 'skipped')
    if (entryIdx !== -1) {
      scheduleData.value.schedule.splice(entryIdx, 1)
    }
    await saveSchedule(`Unskip meeting on ${date}`)
  }

  /**
   * Swap two presenters
   */
  async function swapPresenters(date1, date2) {
    if (!scheduleData.value) return

    // Ensure both dates have schedule entries
    for (const date of [date1, date2]) {
      const existing = scheduleData.value.schedule.find(e => e.date === date)
      if (!existing) {
        // Find from generated schedule
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

    const name1 = getMember(entry1?.presenterId)?.name || 'Unknown'
    const name2 = getMember(entry2?.presenterId)?.name || 'Unknown'
    await saveSchedule(`Swap: ${name1} (${date1}) <-> ${name2} (${date2})`)
  }

  /**
   * Add a new member
   */
  async function addMember(name, position) {
    if (!scheduleData.value) return
    const id = 'member_' + Date.now()
    scheduleData.value.members.push({ id, name, email: '' })
    if (position !== undefined) {
      scheduleData.value.rotation.splice(position, 0, id)
    } else {
      scheduleData.value.rotation.push(id)
    }
    await saveSchedule(`Add member: ${name}`)
  }

  /**
   * Remove a member from rotation (keep in members list for history)
   */
  async function removeMember(memberId) {
    if (!scheduleData.value) return
    scheduleData.value.rotation = scheduleData.value.rotation.filter(id => id !== memberId)
    const member = getMember(memberId)
    await saveSchedule(`Remove from rotation: ${member?.name || memberId}`)
  }

  /**
   * Mark a presentation as completed
   */
  async function markCompleted(date, title = '') {
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
    await saveSchedule(`Mark completed: ${date}`)
  }

  /**
   * Add a file reference to a schedule entry
   */
  async function addFileToEntry(date, filepath) {
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
    await saveSchedule(`Upload slides for ${date}`)
  }

  /**
   * Move member in rotation order
   */
  async function moveInRotation(memberId, newIndex) {
    if (!scheduleData.value) return
    const rotation = scheduleData.value.rotation
    const currentIdx = rotation.indexOf(memberId)
    if (currentIdx === -1) return
    rotation.splice(currentIdx, 1)
    rotation.splice(newIndex, 0, memberId)
    await saveSchedule('Reorder rotation')
  }

  return {
    scheduleData,
    fullSchedule,
    loading,
    error,
    upcomingSchedule,
    pastSchedule,
    loadSchedule,
    saveSchedule,
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
