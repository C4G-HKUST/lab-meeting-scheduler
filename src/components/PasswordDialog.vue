<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['login', 'close'])

const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!password.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const success = await new Promise((resolve) => {
      emit('login', password.value, resolve)
    })
    if (!success) {
      error.value = 'Invalid password. Please try again.'
    }
  } catch (e) {
    error.value = 'Authentication failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Authentication Required</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        Enter the shared lab password to make changes.
      </p>
      <form @submit.prevent="handleSubmit">
        <input
          v-model="password"
          type="password"
          placeholder="Enter password"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          :disabled="loading"
          autofocus
        />
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
        <div class="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !password.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Verifying...</span>
            <span v-else>Login</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
