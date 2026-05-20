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
  fullSchedule, loading, error, scheduleData,
  loadSchedule, getMember,
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
const actionLoading = ref(false)
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

function requireAuth(action) {
  if (!isAuthenticated.value) {
    showPasswordDialog.value = true
    return false
  }
  return true
}

async function handleSkip(date) {
  if (!requireAuth()) return
  const reason = prompt('Reason for skipping (optional):') || ''
  actionLoading.value = true
  try {
    await skipWeek(date, reason)
    actionMessage.value = 'Week skipped successfully!'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to skip week.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

async function handleUnskip(date) {
  if (!requireAuth()) return
  actionLoading.value = true
  try {
    await unskipWeek(date)
    actionMessage.value = 'Week restored successfully!'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to restore week.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

function handleSwapClick(date) {
  if (!requireAuth()) return
  swapSourceDate.value = date
  showSwapModal.value = true
}

async function handleSwapConfirm(date1, date2) {
  showSwapModal.value = false
  actionLoading.value = true
  try {
    await swapPresenters(date1, date2)
    actionMessage.value = 'Swap successful!'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Swap failed.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
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
  actionLoading.value = true
  try {
    await addFileToEntry(uploadDate.value, filepath)
    actionMessage.value = 'File uploaded successfully!'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to record file in schedule.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

async function handleComplete(date) {
  if (!requireAuth()) return
  const title = prompt('Paper title (optional):') || ''
  actionLoading.value = true
  try {
    await markCompleted(date, title)
    actionMessage.value = 'Marked as completed!'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to update.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

async function handleAddMember(name, position) {
  if (!requireAuth()) return
  actionLoading.value = true
  try {
    await addMember(name, position)
    actionMessage.value = `${name} added to rotation!`
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to add member.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

async function handleRemoveMember(memberId) {
  if (!requireAuth()) return
  const member = getMember(memberId)
  if (!confirm(`Remove ${member?.name || memberId} from rotation?`)) return
  actionLoading.value = true
  try {
    await removeMember(memberId)
    actionMessage.value = 'Member removed from rotation.'
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to remove member.'
  } finally {
    actionLoading.value = false
    setTimeout(() => actionMessage.value = '', 3000)
  }
}

async function handleReorder(memberId, newIndex) {
  if (!requireAuth()) return
  actionLoading.value = true
  try {
    await moveInRotation(memberId, newIndex)
    await loadSchedule()
  } catch (e) {
    actionMessage.value = 'Failed to reorder.'
  } finally {
    actionLoading.value = false
  }
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

    <!-- Loading overlay -->
    <div v-if="actionLoading" class="mb-4 flex items-center text-blue-600">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
      <span class="text-sm">Saving changes...</span>
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
          <p class="text-xs text-gray-500">Click actions to modify. Authentication required.</p>
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
