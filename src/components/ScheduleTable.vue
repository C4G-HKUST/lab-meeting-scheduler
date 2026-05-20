<script setup>
import { computed } from 'vue'
import { formatDateDisplay, isThisWeek, isPast } from '../utils/dateUtils'
import { getDownloadUrl } from '../composables/useGithubApi'

const props = defineProps({
  schedule: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  showActions: { type: Boolean, default: false },
})

const emit = defineEmits(['skip', 'unskip', 'swap', 'upload', 'complete'])

function getMemberName(id) {
  const member = props.members.find(m => m.id === id)
  return member ? member.name : 'TBD'
}

function getStatusColor(entry) {
  if (entry.status === 'skipped') return 'bg-gray-100 text-gray-500'
  if (entry.status === 'completed') return 'bg-green-50 text-green-700'
  if (isThisWeek(entry.date)) return 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
  return 'bg-white text-gray-700'
}

function getStatusBadge(entry) {
  if (entry.status === 'skipped') return { text: 'Skipped', class: 'bg-gray-200 text-gray-600' }
  if (entry.status === 'completed') return { text: 'Done', class: 'bg-green-100 text-green-700' }
  if (isThisWeek(entry.date)) return { text: 'This Week', class: 'bg-blue-100 text-blue-700' }
  return { text: 'Upcoming', class: 'bg-gray-100 text-gray-600' }
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="entry in schedule"
      :key="entry.date"
      class="rounded-lg border p-4 transition-all"
      :class="getStatusColor(entry)"
    >
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center space-x-4">
          <div class="text-sm font-medium w-28">
            {{ formatDateDisplay(entry.date) }}
          </div>
          <div class="font-semibold" :class="entry.status === 'skipped' ? 'line-through' : ''">
            {{ entry.status === 'skipped' ? getMemberName(entry.presenterId) || 'N/A' : getMemberName(entry.presenterId) }}
          </div>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getStatusBadge(entry).class"
          >
            {{ getStatusBadge(entry).text }}
          </span>
        </div>
        <div class="flex items-center space-x-2">
          <!-- File download links -->
          <template v-if="entry.files && entry.files.length > 0">
            <a
              v-for="file in entry.files"
              :key="file"
              :href="getDownloadUrl(file)"
              target="_blank"
              class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
            >
              <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ file.split('/').pop() }}
            </a>
          </template>
          <!-- Admin actions -->
          <template v-if="showActions && entry.status !== 'completed'">
            <button
              v-if="entry.status !== 'skipped'"
              @click="$emit('skip', entry.date)"
              class="text-xs px-2 py-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
              title="Skip this week"
            >
              Skip
            </button>
            <button
              v-else
              @click="$emit('unskip', entry.date)"
              class="text-xs px-2 py-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
              title="Restore this week"
            >
              Unskip
            </button>
            <button
              v-if="entry.status !== 'skipped'"
              @click="$emit('swap', entry.date)"
              class="text-xs px-2 py-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Swap with another"
            >
              Swap
            </button>
            <button
              v-if="entry.status !== 'skipped' && !isPast(entry.date)"
              @click="$emit('upload', entry.date)"
              class="text-xs px-2 py-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
              title="Upload slides"
            >
              Upload
            </button>
            <button
              v-if="entry.status === 'upcoming' && isPast(entry.date)"
              @click="$emit('complete', entry.date)"
              class="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
              title="Mark as completed"
            >
              Done
            </button>
          </template>
        </div>
      </div>
      <!-- Title / skip reason -->
      <div v-if="entry.title" class="mt-1 text-sm text-gray-600 ml-32">
        {{ entry.title }}
      </div>
      <div v-if="entry.status === 'skipped' && entry.skipReason" class="mt-1 text-sm text-gray-500 italic ml-32">
        Reason: {{ entry.skipReason }}
      </div>
    </div>
    <div v-if="schedule.length === 0" class="text-center py-8 text-gray-500">
      No schedule entries to display.
    </div>
  </div>
</template>
