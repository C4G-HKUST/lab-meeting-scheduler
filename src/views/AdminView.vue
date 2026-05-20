<script setup>
import { onMounted, ref, computed } from 'vue'
import { useSchedule } from '../composables/useSchedule'
import { useAuth } from '../composables/useAuth'
import ScheduleTable from '../components/ScheduleTable.vue'
import MemberList from '../components/MemberList.vue'
import PasswordDialog from '../components/PasswordDialog.vue'
import SwapModal from '../components/SwapModal.vue'
import FileUpload from '../components/FileUpload.vue'
import { isPast } from '../utils/dateUtils'

const {
  fullSchedule, loading, error, scheduleData, hasUnsavedChanges,
  loadSchedule, saveAllChanges, discardChanges, getMember,
  skipWeek, unskipWeek, swapPresenters,
  addMember, removeMember, markCompleted,
  addFileToEntry, moveInRotation,
} = useSchedule()

const { isAuthenticated, login, restoreSession } = useAuth()

const showPasswordDialog = ref(false)
const showSwapModal = ref(false)
const showFileUpload = ref(false)
const swapSourceDate = ref('')
const uploadDate = ref('')
const uploadPresenter = ref('')
const activeTab = ref('schedule')
const saving = ref(false)
const actionMessage = ref('')

onMounted(() => {
  restoreSession()
  loadSchedule()
})

// Schedule entries for admin (future + recent)
const adminSchedule = computed(() => {
  if (!fullSchedule.value.length) return []
  const today = new Date()
  today.setDate(today.getDate() - 14) // Show 2 weeks back
  return fullSchedule.value
    .filter(e => new Date(e.date) >= today)
    .slice(0, 20)
})

async function handleLogin(password, callback) {
  const success = await login(password)
  callback(success)
  if (success) {
    showPasswordDialog.value = false
    await loadSchedule()
  }
}

function requireAuth() {
  if (!isAuthenticated.value) {
    showPasswordDialog.value = true
    return false
  }
  return true
}

// === Save all changes at once ===
async function handleSave() {
  if (!requireAuth()) return
  saving.value = true
  actionMessage.value = ''
  try {
    await saveAllChanges('Update schedule via admin panel')
    actionMessage.value = 'All changes saved successfully!'
  } catch (e) {
    actionMessage.value = 'Failed to save. Please try again.'
  } finally {
    saving.value = false
    setTimeout(() => actionMessage.value = '', 4000)
  }
}

async function handleDiscard() {
  if (!confirm('Discard all unsaved changes?')) return
  await discardChanges()
  actionMessage.value = 'Changes discarded.'
  setTimeout(() => actionMessage.value = '', 3000)
}

// === Local-only operations (no network calls) ===

function handleSkip(date) {
  if (!requireAuth()) return
  const reason = prompt('Reason for skipping (optional):') || ''
  skipWeek(date, reason)
}

function handleUnskip(date) {
  if (!requireAuth()) return
  unskipWeek(date)
}

function handleSwapClick(date) {
  if (!requireAuth()) return
  swapSourceDate.value = date
  showSwapModal.value = true
}

function handleSwapConfirm(date1, date2) {
  showSwapModal.value = false
  swapPresenters(date1, date2)
}

function handleUploadClick(date) {
  if (!requireAuth()) return
  const entry = fullSchedule.value.find(e => e.date === date)
  uploadDate.value = date
  uploadPresenter.value = entry ? getMember(entry.presenterId)?.name || '' : ''
  showFileUpload.value = true
}

async function handleFileUploaded(filepath) {
  showFileUpload.value = false
  addFileToEntry(uploadDate.value, filepath)
  actionMessage.value = 'File uploaded! Remember to click Save to update the schedule.'
  setTimeout(() => actionMessage.value = '', 4000)
}

function handleComplete(date) {
  if (!requireAuth()) return
  const title = prompt('Paper title (optional):') || ''
  markCompleted(date, title)
}

function handleAddMember(name, position) {
  if (!requireAuth()) return
  addMember(name, position)
}

function handleRemoveMember(memberId) {
  if (!requireAuth()) return
  const member = getMember(memberId)
  if (!confirm(`Remove ${member?.name || memberId} from rotation?`)) return
  removeMember(memberId)
}

function handleReorder(memberId, newIndex) {
  if (!requireAuth()) return
  moveInRotation(memberId, newIndex)
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Admin Panel</h1>
      <p class="mt-2 text-gray-600">Manage schedule, members, and upload slides.</p>
    </div>

    <!-- Auth status -->
    <div v-if="!isAuthenticated" class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <p class="text-yellow-800 text-sm">
          You need to authenticate to make changes.
        </p>
        <button
          @click="showPasswordDialog = true"
          class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
        >
          Login
        </button>
      </div>
    </div>

    <!-- Unsaved changes bar -->
    <div
      v-if="hasUnsavedChanges"
      class="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between"
    >
      <div class="flex items-center space-x-2">
        <span class="inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
        <span class="text-sm font-medium text-orange-800">You have unsaved changes</span>
      </div>
      <div class="flex space-x-2">
        <button
          @click="handleDiscard"
          :disabled="saving"
          class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Discard
        </button>
        <button
          @click="handleSave"
          :disabled="saving"
          class="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <span v-if="saving">Saving...</span>
          <span v-else>Save All Changes</span>
        </button>
      </div>
    </div>

    <!-- Action message -->
    <div
      v-if="actionMessage"
      class="mb-4 px-4 py-2 rounded-lg text-sm font-medium"
      :class="actionMessage.includes('Failed') || actionMessage.includes('failed')
        ? 'bg-red-100 text-red-700'
        : 'bg-green-100 text-green-700'"
    >
      {{ actionMessage }}
    </div>

    <!-- Saving overlay -->
    <div v-if="saving" class="mb-4 flex items-center text-blue-600">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
      <span class="text-sm">Pushing changes to GitHub...</span>
    </div>

    <!-- Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          @click="activeTab = 'schedule'"
          class="py-3 px-1 border-b-2 font-medium text-sm"
          :class="activeTab === 'schedule' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Schedule Management
        </button>
        <button
          @click="activeTab = 'members'"
          class="py-3 px-1 border-b-2 font-medium text-sm"
          :class="activeTab === 'members' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          Members & Rotation
        </button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      {{ error }}
    </div>

    <!-- Content -->
    <template v-else-if="scheduleData">
      <!-- Schedule tab -->
      <div v-show="activeTab === 'schedule'" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Schedule</h2>
          <p class="text-xs text-gray-500">Make changes locally, then click "Save All Changes" to push.</p>
        </div>
        <ScheduleTable
          :schedule="adminSchedule"
          :members="scheduleData.members"
          :show-actions="isAuthenticated"
          @skip="handleSkip"
          @unskip="handleUnskip"
          @swap="handleSwapClick"
          @upload="handleUploadClick"
          @complete="handleComplete"
        />
      </div>

      <!-- Members tab -->
      <div v-show="activeTab === 'members'" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <MemberList
          :members="scheduleData.members"
          :rotation="scheduleData.rotation"
          @add="handleAddMember"
          @remove="handleRemoveMember"
          @reorder="handleReorder"
        />
      </div>
    </template>

    <!-- Modals -->
    <PasswordDialog
      :show="showPasswordDialog"
      @login="handleLogin"
      @close="showPasswordDialog = false"
    />
    <SwapModal
      :show="showSwapModal"
      :schedule-entries="adminSchedule"
      :members="scheduleData?.members || []"
      :current-date="swapSourceDate"
      @confirm="handleSwapConfirm"
      @close="showSwapModal = false"
    />
    <FileUpload
      :show="showFileUpload"
      :date="uploadDate"
      :presenter-name="uploadPresenter"
      @uploaded="handleFileUploaded"
      @close="showFileUpload = false"
    />
  </div>
</template>
