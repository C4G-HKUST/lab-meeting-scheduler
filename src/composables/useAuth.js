import { ref } from 'vue'
import { decrypt } from './useCrypto'
import { readEncryptedToken, initOctokit } from './useGithubApi'

const isAuthenticated = ref(false)
const authError = ref('')

/**
 * Authentication composable using shared password
 * Password decrypts the stored GitHub PAT
 */
export function useAuth() {
  /**
   * Attempt to authenticate with the shared password
   */
  async function login(password) {
    authError.value = ''
    try {
      // Read the encrypted token from the repo
      const encryptedToken = await readEncryptedToken()

      // Try to decrypt it with the provided password
      const token = await decrypt(encryptedToken, password)

      // Validate the token by making a test API call
      initOctokit(token)

      // Store in sessionStorage so user doesn't have to re-enter on page reload
      sessionStorage.setItem('lab_meeting_auth', 'true')
      sessionStorage.setItem('lab_meeting_token', token)

      isAuthenticated.value = true
      return true
    } catch (e) {
      authError.value = 'Invalid password. Please try again.'
      isAuthenticated.value = false
      return false
    }
  }

  /**
   * Try to restore session from sessionStorage
   */
  function restoreSession() {
    const stored = sessionStorage.getItem('lab_meeting_auth')
    const token = sessionStorage.getItem('lab_meeting_token')
    if (stored === 'true' && token) {
      initOctokit(token)
      isAuthenticated.value = true
      return true
    }
    return false
  }

  /**
   * Logout - clear session
   */
  function logout() {
    sessionStorage.removeItem('lab_meeting_auth')
    sessionStorage.removeItem('lab_meeting_token')
    isAuthenticated.value = false
  }

  return {
    isAuthenticated,
    authError,
    login,
    logout,
    restoreSession,
  }
}
