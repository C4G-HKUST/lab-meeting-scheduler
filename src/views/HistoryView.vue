<script setup>
import { onMounted, ref, computed } from 'vue'
import { useSchedule } from '../composables/useSchedule'
import { formatDateDisplay } from '../utils/dateUtils'
import { getDownloadUrl } from '../composables/useGithubApi'

const { fullSchedule, loading, error, scheduleData, loadSchedule, getMember } = useSchedule()

const searchQuery = ref('')

onMounted(() => {
  loadSchedule()
})

// Get completed entries sorted by date (newest first)
const completedEntries = computed(() => {
  return fullSchedule.value
    .filter(e => e.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

// Filtered by search
const filteredEntries = computed(() => {
  if (!searchQuery.value.trim()) return completedEntries.value
  const query = searchQuery.value.toLowerCase()
  return completedEntries.value.filter(entry => {
    const member = getMember(entry.presenterId)
    const name = member?.name?.toLowerCase() || ''
    const title = entry.title?.toLowerCase() || ''
    const date = entry.date || ''
    return name.includes(query) || title.includes(query) || date.includes(query)
  })
})

function getMemberName(id) {
  const member = getMember(id)
  return member?.name || 'Unknown'
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Presentation History</h1>
      <p class="mt-2 text-gray-600">Browse and download past presentation slides.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Loading...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {{ error }}
    </div>

    <template v-else>
      <!-- Search -->
      <div class="mb-6">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name, title, or date..."
          class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <!-- Results -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presenter</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="entry in filteredEntries" :key="entry.date" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDateDisplay(entry.date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ getMemberName(entry.presenterId) }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                {{ entry.title || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div v-if="entry.files && entry.files.length > 0" class="flex flex-wrap gap-1">
                  <a
                    v-for="file in entry.files"
                    :key="file"
                    :href="getDownloadUrl(file)"
                    target="_blank"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {{ file.split('/').pop() }}
                  </a>
                </div>
                <span v-else class="text-gray-400">No files</span>
              </td>
            </tr>
            <tr v-if="filteredEntries.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                {{ searchQuery ? 'No matching entries found.' : 'No completed presentations yet.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-4 text-sm text-gray-500 text-center">
        {{ filteredEntries.length }} presentation{{ filteredEntries.length !== 1 ? 's' : '' }} found
      </p>
    </template>
  </div>
</template>
