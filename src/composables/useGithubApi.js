import { Octokit } from '@octokit/rest'

/**
 * GitHub API wrapper for reading/writing repo contents
 */

// Repository configuration - change these to match your repo
const REPO_OWNER = 'C4G-HKUST'
const REPO_NAME = 'lab-meeting-scheduler'
const BRANCH = 'main'
const DATA_PATH = 'data/schedule.json'
const TOKEN_PATH = 'data/token.enc'
const SLIDES_DIR = 'slides'

let octokitInstance = null

/**
 * Initialize Octokit with a token (after decryption)
 */
export function initOctokit(token) {
  octokitInstance = new Octokit({ auth: token })
}

/**
 * Get the current Octokit instance
 */
export function getOctokit() {
  return octokitInstance
}

/**
 * Read a file via raw.githubusercontent.com (no rate limit, no auth needed)
 * Does NOT return SHA (use getFileSha for that)
 */
async function readFileRaw(path) {
  const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${path}?t=${Date.now()}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to read ${path}: ${response.status}`)
  return await response.text()
}

/**
 * Get the SHA of a file (requires API call, use authenticated if possible)
 */
async function getFileSha(path) {
  if (octokitInstance) {
    // Use authenticated API (5000 req/hr)
    const response = await octokitInstance.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
    })
    return response.data.sha
  }
  // Fallback to unauthenticated API
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
  if (!response.ok) throw new Error(`Failed to get SHA for ${path}: ${response.status}`)
  const data = await response.json()
  return data.sha
}

/**
 * Read the schedule data (uses raw URL, no rate limit)
 */
export async function readSchedule() {
  const content = await readFileRaw(DATA_PATH)
  const data = JSON.parse(content)
  // Get SHA only if authenticated (needed for saving later)
  let sha = null
  if (octokitInstance) {
    try {
      sha = await getFileSha(DATA_PATH)
    } catch (e) {
      console.warn('Failed to get SHA, will retry on save:', e)
    }
  }
  return { data, sha }
}

/**
 * Read the encrypted token (uses raw URL, no rate limit)
 */
export async function readEncryptedToken() {
  const content = await readFileRaw(TOKEN_PATH)
  return content.trim()
}

/**
 * Ensure we have a valid SHA for the data file (fetch if missing)
 */
export async function ensureScheduleSha() {
  return await getFileSha(DATA_PATH)
}

/**
 * Write/update a file in the repo (requires auth)
 */
export async function writeFile(path, content, sha, message) {
  if (!octokitInstance) throw new Error('Not authenticated')

  // If SHA is missing, fetch it now
  if (!sha) {
    sha = await getFileSha(path)
  }

  const response = await octokitInstance.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    sha,
  })
  return response.data.content.sha
}

/**
 * Update the schedule data (requires auth)
 */
export async function writeSchedule(scheduleData, sha, message = 'Update schedule') {
  const content = JSON.stringify(scheduleData, null, 2)
  return writeFile(DATA_PATH, content, sha, message)
}

/**
 * Upload a file to the slides directory (requires auth)
 */
export async function uploadFile(filename, fileContent, message) {
  if (!octokitInstance) throw new Error('Not authenticated')
  const path = `${SLIDES_DIR}/${filename}`

  // Check if file already exists (to get sha for update)
  let sha = undefined
  try {
    const existing = await octokitInstance.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
    })
    sha = existing.data.sha
  } catch (e) {
    // File doesn't exist, that's fine
  }

  const response = await octokitInstance.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message: message || `Upload slides: ${filename}`,
    content: fileContent, // already base64
    sha,
  })
  return response.data.content
}

/**
 * Get download URL for a file in the slides directory
 */
export function getDownloadUrl(filepath) {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${filepath}`
}

/**
 * List files in the slides directory (public)
 */
export async function listSlides() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SLIDES_DIR}`
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
  if (!response.ok) return []
  const data = await response.json()
  return data.filter(f => f.type === 'file' && f.name !== '.gitkeep')
}

export { REPO_OWNER, REPO_NAME }
