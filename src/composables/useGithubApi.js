import { Octokit } from '@octokit/rest'

/**
 * GitHub API wrapper for reading/writing repo contents
 */

// Repository configuration - change these to match your repo
const REPO_OWNER = 'C4G-HKUST'
const REPO_NAME = 'lab-meeting-scheduler'
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
 * Read a file from the repo (public, no auth needed)
 */
export async function readFile(path) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })
  if (!response.ok) throw new Error(`Failed to read ${path}: ${response.status}`)
  const data = await response.json()
  return {
    content: atob(data.content),
    sha: data.sha,
  }
}

/**
 * Read the schedule data (public)
 */
export async function readSchedule() {
  const { content, sha } = await readFile(DATA_PATH)
  return { data: JSON.parse(content), sha }
}

/**
 * Read the encrypted token (public)
 */
export async function readEncryptedToken() {
  const { content } = await readFile(TOKEN_PATH)
  return content.trim()
}

/**
 * Write/update a file in the repo (requires auth)
 */
export async function writeFile(path, content, sha, message) {
  if (!octokitInstance) throw new Error('Not authenticated')
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
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${filepath}`
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
