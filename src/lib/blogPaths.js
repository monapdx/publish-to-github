/** GitHub Pages site root folder (contains index.html, style.css). */
export const BLOG_ROOT_DIR = 'blog'

/** Subfolder under /blog for published post HTML files. */
export const POSTS_SUBDIR = 'posts'

/** Default posts path in repo settings. */
export const DEFAULT_POSTS_PATH = `${BLOG_ROOT_DIR}/${POSTS_SUBDIR}/`

export function dirOf(repoPath) {
  const p = String(repoPath || '').replace(/\\/g, '/')
  if (!p.includes('/')) return ''
  return p.replace(/\/[^/]+$/, '')
}

/**
 * Normalize user posts folder input to `blog/posts/` when they enter `blog/` only.
 */
export function normalizePostsPathInput(postsPath) {
  let s = String(postsPath ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!s) return DEFAULT_POSTS_PATH
  if (!s.endsWith('/')) s += '/'
  const bare = s.replace(/\/+$/, '')
  if (bare === BLOG_ROOT_DIR) return DEFAULT_POSTS_PATH
  return s
}

/** Site root directory, e.g. `blog`. */
export function resolveBlogRoot(postsPath) {
  const normalized = normalizePostsPathInput(postsPath).replace(/\/+$/, '')
  const parts = normalized.split('/').filter(Boolean)
  if (parts[parts.length - 1] === POSTS_SUBDIR) {
    return parts.slice(0, -1).join('/') || BLOG_ROOT_DIR
  }
  return parts[0] || BLOG_ROOT_DIR
}

/** Where new post .html files are written, e.g. `blog/posts`. */
export function resolvePostsDirectory(postsPath) {
  const root = resolveBlogRoot(postsPath)
  return `${root}/${POSTS_SUBDIR}`
}

/** Homepage file path, e.g. `blog/index.html`. */
export function resolveBlogIndexPath(settings = {}) {
  const custom = String(settings.indexPagePath ?? '').trim()
  if (custom) return custom.replace(/\\/g, '/').replace(/^\/+/, '')
  return `${resolveBlogRoot(settings.postsPath)}/index.html`
}

/**
 * Relative href from index.html to a post (e.g. `posts/my-slug.html`).
 */
export function postUrlForIndex(postRepoPath, indexRepoPath) {
  const file = postRepoPath.split('/').pop() || 'post.html'
  const postDir = dirOf(postRepoPath)
  const indexDir = dirOf(indexRepoPath)
  if (!indexDir || postDir === indexDir) return file
  if (postDir.startsWith(`${indexDir}/`)) {
    return `${postDir.slice(indexDir.length + 1)}/${file}`
  }
  return file
}

/** Stylesheet link from a post file to `blog/style.css`. */
export function stylesheetHrefForPost(postRepoPath, blogRoot) {
  const root = blogRoot || BLOG_ROOT_DIR
  const postDir = dirOf(postRepoPath)
  if (postDir === root) return 'style.css'
  return '../style.css'
}
