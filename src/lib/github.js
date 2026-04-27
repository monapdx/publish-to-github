const API = 'https://api.github.com'

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
