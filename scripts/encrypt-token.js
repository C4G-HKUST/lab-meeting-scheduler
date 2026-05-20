#!/usr/bin/env node

/**
 * Token Encryption Script
 *
 * This script encrypts a GitHub Personal Access Token with a password
 * and saves it to data/token.enc
 *
 * Usage:
 *   node scripts/encrypt-token.js
 *
 * You will be prompted to enter:
 *   1. The shared password (used by lab members to authenticate)
 *   2. The GitHub Fine-grained PAT (with Contents: read/write permission for this repo only)
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SALT = Buffer.from('lab-meeting-scheduler-salt-v1')
const IV_LENGTH = 12

function deriveKey(password) {
  return crypto.pbkdf2Sync(password, SALT, 100000, 32, 'sha256')
}

function encrypt(plaintext, password) {
  const key = deriveKey(password)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine: iv (12) + ciphertext + authTag (16)
  const combined = Buffer.concat([iv, encrypted, authTag])
  return combined.toString('base64')
}

function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer))
  })
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('=== Lab Meeting Scheduler - Token Encryption ===\n')
  console.log('This script encrypts your GitHub PAT with the shared password.')
  console.log('The encrypted token will be saved to data/token.enc\n')

  const password = await question(rl, 'Enter the shared password: ')
  if (!password) {
    console.error('Password cannot be empty.')
    process.exit(1)
  }

  const confirmPassword = await question(rl, 'Confirm password: ')
  if (password !== confirmPassword) {
    console.error('Passwords do not match.')
    process.exit(1)
  }

  const token = await question(rl, '\nEnter GitHub Fine-grained PAT: ')
  if (!token.startsWith('github_pat_') && !token.startsWith('ghp_')) {
    console.warn('\nWarning: Token does not look like a GitHub PAT. Continuing anyway...')
  }

  const encrypted = encrypt(token, password)

  const outputPath = path.join(__dirname, '..', 'data', 'token.enc')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, encrypted)

  console.log(`\nToken encrypted and saved to: ${outputPath}`)
  console.log('\nNext steps:')
  console.log('1. Commit and push data/token.enc to your repository')
  console.log('2. Share the password with lab members')
  console.log('3. NEVER commit the raw token to the repository')

  rl.close()
}

main().catch(console.error)
