<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: Boolean,
  scheduleEntries: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  currentDate: String,
})

const emit = defineEmits(['confirm', 'close'])

const selectedDate = ref('')

function getMemberName(id) {
  const member = props.members.find(m => m.id === id)
  return member ? member.name : 'Unknown'
}

function handleConfirm() {
  if (selectedDate.value && selectedDate.value !== props.currentDate) {
    emit('confirm', props.currentDate, selectedDate.value)
  }
}

// Available dates for swapping (exclude current date and skipped)
function getAvailableDates() {
  return props.scheduleEntries.filter(
    e => e.date !== props.currentDate && e.status !== 'skipped' && e.status !== 'completed'
  )
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Swap Presenter</h3>
      <p class="text-sm text-gray-600 mb-4">
        Select the date to swap with <strong>{{ currentDate }}</strong>:
      </p>
      <div class="max-h-60 overflow-y-auto space-y-2 mb-4">
        <label
          v-for="entry in getAvailableDates()"
          :key="entry.date"
          class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
          :class="selectedDate === entry.date ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
        >
          <input
            type="radio"
            :value="entry.date"
            v-model="selectedDate"
            class="mr-3"
          />
          <span class="text-sm">
            <span class="font-medium">{{ entry.date }}</span>
            <span class="text-gray-500 ml-2">{{ getMemberName(entry.presenterId) }}</span>
          </span>
        </label>
      </div>
      <div class="flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          @click="handleConfirm"
          :disabled="!selectedDate"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Swap
        </button>
      </div>
    </div>
  </div>
</template>
