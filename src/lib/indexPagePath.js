import { getIndexPath } from './blogIndex'

/**
 * Turn a user-entered blog index URL or path into a repo-relative file path.
 * @param {string} input
 * @param {string} [postsPath] fallback when input is empty
 */
export function normalizeIndexPagePath(input, postsPath) {
  const raw = String(input ?? '').trim()
  if (!raw) return getIndexPath(postsPath)

  const blobMatch = raw.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+?)(?:\?|#|$)/i)
  if (blobMatch) {
    return decodeURIComponent(blobMatch[1].replace(/\\/g, '/'))
  }

  const treeMatch = raw.match(/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/(.+?)(?:\?|#|$)/i)
  if (treeMatch) {
    let p = decodeURIComponent(treeMatch[1].replace(/\\/g, '/'))
    if (!/\.html?$/i.test(p)) p = p.replace(/\/?$/, '/index.html')
    return p
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      let p = u.pathname.replace(/^\/+/, '')
      if (p && !/\.html?$/i.test(p)) p = p.replace(/\/?$/, '/index.html')
      return p || getIndexPath(postsPath)
    } catch {
      return raw.replace(/\\/g, '/').replace(/^\/+/, '')
    }
  }

  return raw.replace(/\\/g, '/').replace(/^\/+/, '')
}

/**
 * @param {{ postsPath?: string, indexPagePath?: string }} settings
 */
export function resolveIndexPath(settings) {
  const custom = settings?.indexPagePath?.trim()
  if (custom) return normalizeIndexPagePath(custom, settings.postsPath)
  return getIndexPath(settings?.postsPath)
}

/** Directory depth for a repo file path (blog/index.html → 1, index.html → 0). */
export function repoPathDepth(repoPath) {
  const parts = String(repoPath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
  if (parts.length <= 1) return 0
  return parts.length - 1
}
