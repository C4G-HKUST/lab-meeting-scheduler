<script setup>
import { ref } from 'vue'
import { uploadFile } from '../composables/useGithubApi'

const props = defineProps({
  show: Boolean,
  date: String,
  presenterName: String,
})

const emit = defineEmits(['uploaded', 'close'])

const file = ref(null)
const uploading = ref(false)
const error = ref('')
const progress = ref('')

function handleFileSelect(event) {
  const selected = event.target.files[0]
  if (!selected) return

  // Validate file type
  const validTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.apple.keynote',
  ]
  const validExtensions = ['.pdf', '.ppt', '.pptx', '.key']
  const ext = '.' + selected.name.split('.').pop().toLowerCase()

  if (!validTypes.includes(selected.type) && !validExtensions.includes(ext)) {
    error.value = 'Please select a PDF, PPT, PPTX, or Keynote file.'
    return
  }

  // Validate file size (50MB max)
  if (selected.size > 50 * 1024 * 1024) {
    error.value = 'File size must be under 50MB.'
    return
  }

  error.value = ''
  file.value = selected
}

async function handleUpload() {
  if (!file.value) return

  uploading.value = true
  error.value = ''
  progress.value = 'Reading file...'

  try {
    // Read file as base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result.split(',')[1] // Remove data:...;base64, prefix
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file.value)
    })

    // Generate filename: date_name_originalname.ext
    const ext = file.value.name.split('.').pop()
    const safeName = (props.presenterName || 'unknown').replace(/\s+/g, '-').toLowerCase()
    const filename = `${props.date}_${safeName}.${ext}`

    progress.value = 'Uploading to GitHub...'
    await uploadFile(filename, base64, `Upload slides: ${filename}`)

    progress.value = ''
    emit('uploaded', `slides/${filename}`)
  } catch (e) {
    error.value = 'Upload failed: ' + e.message
    console.error(e)
  } finally {
    uploading.value = false
    progress.value = ''
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Upload Slides</h3>
      <p class="text-sm text-gray-600 mb-4">
        Upload slides for <strong>{{ presenterName }}</strong> on <strong>{{ date }}</strong>
      </p>

      <div class="mb-4">
        <label class="block">
          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            :class="file ? 'border-green-400 bg-green-50' : ''"
          >
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.key"
              class="hidden"
              @change="handleFileSelect"
              :disabled="uploading"
            />
            <div v-if="!file">
              <svg class="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="mt-2 text-sm text-gray-600">Click to select a file</p>
              <p class="text-xs text-gray-500">PDF, PPT, PPTX, Keynote (max 50MB)</p>
            </div>
            <div v-else>
              <svg class="mx-auto h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="mt-2 text-sm font-medium text-green-700">{{ file.name }}</p>
              <p class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(1) }} MB</p>
            </div>
          </div>
        </label>
      </div>

      <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>
      <p v-if="progress" class="mb-3 text-sm text-blue-600">{{ progress }}</p>

      <div class="flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          :disabled="uploading"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          @click="handleUpload"
          :disabled="!file || uploading"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <span v-if="uploading">Uploading...</span>
          <span v-else>Upload</span>
        </button>
      </div>
    </div>
  </div>
</template>
