# Lab Meeting Scheduler

A simple, free web app for managing lab meeting schedules, deployed on GitHub Pages with data stored in the GitHub repository.

## Features

- **Schedule View**: See upcoming and recent presentations
- **Auto-rotation**: Members automatically cycle through the presenter queue
- **Manual Adjustments**: Swap slots, skip weeks, add/remove members
- **File Upload**: Presenters upload their slides (PDF/PPT) directly
- **File Download**: Anyone can browse and download past slides
- **Shared Password Auth**: Simple authentication for admin actions
- **Zero Cost**: Entirely free using GitHub Pages + GitHub API

## Setup Guide

### 1. Create GitHub Repository

Create a new repository on GitHub (e.g., `your-org/lab-meeting-scheduler`).

### 2. Configure Repository Info

Edit `src/composables/useGithubApi.js` and update:

```javascript
const REPO_OWNER = 'your-org'       // Your GitHub org or username
const REPO_NAME = 'lab-meeting-scheduler'  // Your repo name
```

### 3. Create a GitHub Fine-grained PAT

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set:
   - **Token name**: `lab-meeting-scheduler`
   - **Expiration**: 1 year (max)
   - **Repository access**: Only select repositories → select your repo
   - **Permissions**: Contents → Read and write
4. Generate and copy the token

### 4. Encrypt the Token

```bash
node scripts/encrypt-token.js
```

Enter your shared lab password and the GitHub PAT. This generates `data/token.enc`.

### 5. Edit Schedule Data

Edit `data/schedule.json` to add your lab members:

```json
{
  "settings": {
    "meetingDay": "wednesday",
    "startDate": "2026-05-21",
    "title": "Your Lab Meeting"
  },
  "members": [
    { "id": "alice", "name": "Alice Zhang", "email": "" },
    { "id": "bob", "name": "Bob Li", "email": "" }
  ],
  "rotation": ["alice", "bob"],
  "schedule": [],
  "skippedDates": []
}
```

### 6. Deploy

Push to GitHub. The GitHub Actions workflow will automatically build and deploy to GitHub Pages.

Make sure to enable GitHub Pages in your repo settings:
- Settings → Pages → Source: GitHub Actions

### 7. Share

Share the URL (`https://your-org.github.io/lab-meeting-scheduler/`) with lab members along with the shared password.

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Token Rotation

The GitHub PAT expires after 1 year. To rotate:

1. Generate a new PAT (same permissions)
2. Run `node scripts/encrypt-token.js` with the same password
3. Commit and push the new `data/token.enc`

## Architecture

```
Browser ←→ GitHub Pages (static SPA)
              ↕ (GitHub REST API with decrypted PAT)
         GitHub Repo (schedule.json + slides/)
```

- **Read** operations (view schedule, download files) require no authentication
- **Write** operations (modify schedule, upload files) require the shared password
- Password decrypts the stored PAT → PAT authenticates with GitHub API
- All data is version-controlled in the repository

## Tech Stack

- Vue 3 + Vite
- Tailwind CSS
- Octokit (GitHub API client)
- Web Crypto API (AES-256-GCM encryption)
