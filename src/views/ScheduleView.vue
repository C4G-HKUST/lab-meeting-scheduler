<script setup>
import { onMounted, computed } from 'vue'
import { useSchedule } from '../composables/useSchedule'
import ScheduleTable from '../components/ScheduleTable.vue'
import { isPast } from '../utils/dateUtils'

const { fullSchedule, loading, error, scheduleData, loadSchedule, getMember } = useSchedule()

onMounted(() => {
  loadSchedule()
})

// Show upcoming + current week + 2 recent completed
const displaySchedule = computed(() => {
  if (!fullSchedule.value.length) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find entries: show 2 past completed + all future
  const past = fullSchedule.value
    .filter(e => isPast(e.date) && e.status === 'completed')
    .slice(-2)

  const future = fullSchedule.value
    .filter(e => !isPast(e.date) || e.status !== 'completed')
    .filter(e => {
      const d = new Date(e.date)
      d.setHours(0, 0, 0, 0)
      return d >= today
    })
    .slice(0, 10)

  return [...past, ...future]
})

// Next up info
const nextPresentation = computed(() => {
  const next = fullSchedule.value.find(e => !isPast(e.date) && e.status === 'upcoming')
  if (!next) return null
  const member = getMember(next.presenterId)
  return { ...next, presenterName: member?.name || 'TBD' }
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ scheduleData?.settings?.title || 'Lab Meeting Schedule' }}
      </h1>
      <p class="mt-2 text-gray-600">
        Weekly paper sharing sessions every Wednesday
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Loading schedule...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {{ error }}
    </div>

    <!-- Content -->
    <template v-else-if="scheduleData">
      <!-- Next up card -->
      <div v-if="nextPresentation" class="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-100 text-sm font-medium">Next Presentation</p>
            <p class="text-2xl font-bold mt-1">{{ nextPresentation.presenterName }}</p>
            <p class="text-blue-100 mt-1">{{ nextPresentation.date }}</p>
          </div>
          <div class="text-5xl opacity-80">🎤</div>
        </div>
      </div>

      <!-- Schedule table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Upcoming Schedule</h2>
        <ScheduleTable
          :schedule="displaySchedule"
          :members="scheduleData.members"
        />
      </div>

      <!-- Info -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>Total members in rotation: {{ scheduleData.rotation?.length || 0 }}</p>
        <p class="mt-1">
          Need to make changes?
          <router-link to="/admin" class="text-blue-600 hover:underline">Go to Admin Panel</router-link>
        </p>
      </div>
    </template>
  </div>
</template>
