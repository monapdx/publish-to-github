import { BLOG_POSTS } from './blogPaths'

const API = 'https://api.github.com'

export class GitHubApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, bodyText?: string }} [meta]
   */
  constructor(message, { status = 0, bodyText = '' } = {}) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.bodyText = bodyText
  }
}

async function throwUnlessOk(res) {
  if (res.ok) return
  const bodyText = await res.text()
  throw new GitHubApiError(`GitHub ${res.status}: ${bodyText}`, { status: res.status, bodyText })
}

/** Encode each segment for the contents API path. */
function encodeRepoPath(path) {
  return String(path)
    .split('/')
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join('/')
}

/** Trim accidental spaces/newlines when pasting a PAT. */
export function normalizeGithubToken(token) {
  return String(token ?? '').trim()
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${normalizeGithubToken(token)}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/**
 * Verify the token can access this repo (fine-grained or classic).
 * @throws {GitHubApiError}
 */
export async function validateGithubConnection({ token, owner, repo, branch }) {
  const cleanToken = normalizeGithubToken(token)
  const cleanOwner = String(owner ?? '').trim()
  const cleanRepo = String(repo ?? '').trim()
  const cleanBranch = (branch || 'main').trim() || 'main'

  if (!cleanToken || !cleanOwner || !cleanRepo) {
    throw new GitHubApiError('Missing token, owner, or repo', { status: 0 })
  }

  const repoUrl = `${API}/repos/${cleanOwner}/${cleanRepo}`
  const repoRes = await fetch(repoUrl, { headers: headers(cleanToken) })
  if (!repoRes.ok) {
    const bodyText = await repoRes.text()
    throw new GitHubApiError(`GitHub ${repoRes.status}: ${bodyText}`, {
      status: repoRes.status,
      bodyText,
    })
  }

  const refUrl = `${API}/repos/${cleanOwner}/${cleanRepo}/git/ref/heads/${encodeURIComponent(cleanBranch)}`
  const refRes = await fetch(refUrl, { headers: headers(cleanToken) })
  if (!refRes.ok) {
    const bodyText = await refRes.text()
    throw new GitHubApiError(`GitHub ${refRes.status}: ${bodyText}`, {
      status: refRes.status,
      bodyText,
    })
  }

  return { ok: true, token: cleanToken, owner: cleanOwner, repo: cleanRepo, branch: cleanBranch }
}

/**
 * @param {{ token: string, owner: string, repo: string, path: string, branch: string }} opts
 * @returns {Promise<string|null>} file sha or null if missing
 */
export async function getFileSha({ token, owner, repo, path, branch }) {
  const q = new URLSearchParams({ ref: branch })
  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}?${q}`
  const res = await fetch(url, { headers: headers(token) })
  if (res.status === 404) return null
  await throwUnlessOk(res)
  const data = await res.json()
  if (data && typeof data.sha === 'string') return data.sha
  return null
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToUtf8(b64) {
  const clean = String(b64).replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * List HTML files in the configured posts directory (non-recursive).
 * @param {{ token: string, owner: string, repo: string, branch: string }} opts
 * @returns {Promise<Array<{ name: string, path: string, sha: string }>>}
 */
/**
 * List files in a repo directory (non-recursive).
 * @returns {Promise<Array<{ name: string, path: string, type: string }>>}
 */
function normalizeListDir(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return ''
  return dirPath.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export async function listRepoDirectory({ token, owner, repo, branch, dirPath = '' }) {
  const dir = normalizeListDir(dirPath)
  const q = new URLSearchParams({ ref: branch || 'main' })
  const segment = dir ? encodeRepoPath(dir) : ''
  const url = segment
    ? `${API}/repos/${owner}/${repo}/contents/${segment}?${q}`
    : `${API}/repos/${owner}/${repo}/contents/?${q}`
  const res = await fetch(url, { headers: headers(token) })
  if (res.status === 404) return []
  await throwUnlessOk(res)
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .filter((e) => e?.name && (e.type === 'file' || e.type === 'dir'))
    .map((e) => ({ name: e.name, path: e.path, type: e.type }))
}

export async function listPostHtmlFiles({ token, owner, repo, branch }) {
  const dir = BLOG_POSTS
  const q = new URLSearchParams({ ref: branch || 'main' })
  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(dir)}?${q}`
  const res = await fetch(url, { headers: headers(token) })
  if (res.status === 404) return []
  await throwUnlessOk(res)
  const data = await res.json()
  if (!Array.isArray(data)) {
    if (data?.type === 'file' && /\.html$/i.test(data.name ?? '')) {
      return [{ name: data.name, path: data.path, sha: data.sha }]
    }
    return []
  }
  return data
    .filter((e) => e?.type === 'file' && typeof e.name === 'string' && /\.html$/i.test(e.name))
    .map((e) => ({ name: e.name, path: e.path, sha: e.sha }))
}

/**
 * Fetch and decode a text file from the repo.
 * @param {{ token: string, owner: string, repo: string, path: string, branch: string }} opts
 * @returns {Promise<{ sha: string, text: string }>}
 */
export async function fetchRepoFileText({ token, owner, repo, path, branch }) {
  const q = new URLSearchParams({ ref: branch || 'main' })
  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}?${q}`
  const res = await fetch(url, { headers: headers(token) })
  if (res.status === 404) {
    const bodyText = await res.text()
    throw new GitHubApiError(`File not found (404): ${bodyText}`, { status: 404, bodyText })
  }
  await throwUnlessOk(res)
  const data = await res.json()
  if (Array.isArray(data)) {
    throw new Error('Expected a file path, not a directory')
  }
  if (typeof data.content !== 'string') {
    throw new Error('File is too large or not available via the contents API')
  }
  return { sha: data.sha, text: base64ToUtf8(data.content) }
}

/**
 * Create or update a text file in the repo.
 * @param {{ token: string, owner: string, repo: string, path: string, branch: string, content: string, message: string, sha?: string|null }} opts
 */
export async function upsertFile({
  token,
  owner,
  repo,
  path,
  branch,
  content,
  message,
  sha = null,
}) {
  const body = {
    message,
    content: utf8ToBase64(content),
    branch,
  }
  if (sha) body.sha = sha

  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  await throwUnlessOk(res)
  return res.json()
}

/**
 * Delete a file from the repo (requires the file SHA).
 * @param {{ token: string, owner: string, repo: string, path: string, branch: string, message: string, sha: string }} opts
 */
export async function deleteFile({ token, owner, repo, path, branch, message, sha }) {
  if (!sha) {
    throw new GitHubApiError('Cannot delete file without SHA', { status: 0 })
  }
  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...headers(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sha,
      branch: branch || 'main',
    }),
  })
  await throwUnlessOk(res)
  return res.json()
}
