<script setup>
import { ref } from 'vue'

const props = defineProps({
  members: { type: Array, default: () => [] },
  rotation: { type: Array, default: () => [] },
})

const emit = defineEmits(['add', 'remove', 'reorder'])

const newMemberName = ref('')
const insertPosition = ref('')

function handleAdd() {
  if (!newMemberName.value.trim()) return
  const pos = insertPosition.value !== '' ? parseInt(insertPosition.value) : undefined
  emit('add', newMemberName.value.trim(), pos)
  newMemberName.value = ''
  insertPosition.value = ''
}

function getMemberName(id) {
  const member = props.members.find(m => m.id === id)
  return member ? member.name : id
}

function moveUp(index) {
  if (index <= 0) return
  emit('reorder', props.rotation[index], index - 1)
}

function moveDown(index) {
  if (index >= props.rotation.length - 1) return
  emit('reorder', props.rotation[index], index + 1)
}
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Members & Rotation Order</h3>

    <!-- Add new member -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Add New Member</h4>
      <div class="flex flex-wrap gap-2">
        <input
          v-model="newMemberName"
          type="text"
          placeholder="Name"
          class="flex-1 min-w-[150px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          @keyup.enter="handleAdd"
        />
        <input
          v-model="insertPosition"
          type="number"
          placeholder="Position (optional)"
          min="0"
          :max="rotation.length"
          class="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <button
          @click="handleAdd"
          :disabled="!newMemberName.trim()"
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <p class="mt-1 text-xs text-gray-500">Leave position empty to add at the end of the rotation.</p>
    </div>

    <!-- Rotation list -->
    <div class="space-y-2">
      <div
        v-for="(memberId, index) in rotation"
        :key="memberId"
        class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
      >
        <div class="flex items-center space-x-3">
          <span class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {{ index + 1 }}
          </span>
          <span class="font-medium text-gray-900">{{ getMemberName(memberId) }}</span>
        </div>
        <div class="flex items-center space-x-1">
          <button
            @click="moveUp(index)"
            :disabled="index === 0"
            class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            @click="moveDown(index)"
            :disabled="index === rotation.length - 1"
            class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            @click="$emit('remove', memberId)"
            class="p-1 text-gray-400 hover:text-red-600 ml-2"
            title="Remove from rotation"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <p v-if="rotation.length === 0" class="text-center py-6 text-gray-500 text-sm">
      No members in rotation. Add members above.
    </p>
  </div>
</template>
