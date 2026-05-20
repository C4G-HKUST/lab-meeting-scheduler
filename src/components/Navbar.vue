<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { isAuthenticated, logout } = useAuth()
const router = useRouter()
const mobileMenuOpen = ref(false)

function handleLogout() {
  logout()
  router.push('/')
}
</script>

<template>
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-xl">📅</span>
            <span class="font-bold text-gray-900 text-lg">Lab Meeting</span>
          </router-link>
          <div class="hidden md:flex space-x-4">
            <router-link
              to="/"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              active-class="text-blue-600 bg-blue-50"
            >
              Schedule
            </router-link>
            <router-link
              to="/history"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              active-class="text-blue-600 bg-blue-50"
            >
              History
            </router-link>
            <router-link
              to="/admin"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              active-class="text-blue-600 bg-blue-50"
            >
              Admin
            </router-link>
          </div>
        </div>
        <div class="flex items-center">
          <span
            v-if="isAuthenticated"
            class="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
          >
            Authenticated
          </span>
          <button
            v-if="isAuthenticated"
            @click="handleLogout"
            class="ml-3 hidden md:inline-flex text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
          <!-- Mobile menu button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-gray-200 bg-white">
      <div class="px-4 py-3 space-y-2">
        <router-link to="/" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700" @click="mobileMenuOpen = false">Schedule</router-link>
        <router-link to="/history" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700" @click="mobileMenuOpen = false">History</router-link>
        <router-link to="/admin" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700" @click="mobileMenuOpen = false">Admin</router-link>
        <button v-if="isAuthenticated" @click="handleLogout(); mobileMenuOpen = false" class="block w-full text-left px-3 py-2 text-sm text-red-600">Logout</button>
      </div>
    </div>
  </nav>
</template>
