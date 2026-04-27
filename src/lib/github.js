const API = 'https://api.github.com'

/** Normalize posts folder to a directory path (no leading slash, trailing slash optional). */
function normalizePostsDirectory(postsPath) {
  if (!postsPath || typeof postsPath !== 'string') return 'blog'
  let s = postsPath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  s = s.replace(/\/+$/, '')
  return s || 'blog'
}

/** Encode each segment for the contents API path. */
function encodeRepoPath(path) {
  return String(path)
    .split('/')
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join('/')
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${res.status}: ${text}`)
  }
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
 * @param {{ token: string, owner: string, repo: string, branch: string, postsPath: string }} opts
 * @returns {Promise<Array<{ name: string, path: string, sha: string }>>}
 */
export async function listPostHtmlFiles({ token, owner, repo, branch, postsPath }) {
  const dir = normalizePostsDirectory(postsPath)
  const q = new URLSearchParams({ ref: branch || 'main' })
  const url = `${API}/repos/${owner}/${repo}/contents/${encodeRepoPath(dir)}?${q}`
  const res = await fetch(url, { headers: headers(token) })
  if (res.status === 404) return []
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${res.status}: ${text}`)
  }
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
    const text = await res.text()
    throw new Error(`File not found (404): ${text}`)
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${res.status}: ${text}`)
  }
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${res.status}: ${text}`)
  }
  return res.json()
}
