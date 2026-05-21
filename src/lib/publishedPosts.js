import { postRepoPath } from './blogPaths'

/** Slug derived from a repo file entry (e.g. my-post.html → my-post). */
export function publishedFileSlug(file) {
  return String(file?.name ?? '').replace(/\.html$/i, '') || ''
}

/** Slug for sidebar filtering (optimistic entries store slug explicitly). */
export function publishedEntrySlug(post) {
  const explicit = String(post?.slug ?? '').trim()
  if (explicit) return explicit
  return publishedFileSlug(post)
}

/** Sidebar list: hide posts the user just deleted until repo API confirms removal. */
export function filterVisiblePublishedPosts(files, recentlyDeletedSlugs) {
  const blocked = new Set(recentlyDeletedSlugs)
  return files.filter((post) => !blocked.has(publishedEntrySlug(post)))
}

/**
 * Merge GitHub contents API list with local optimistic entries not yet returned by the API.
 * @param {Array<object>} localFiles
 * @param {Array<{ name: string, path: string, sha?: string }>} repoFiles
 */
export function mergeRepoPublishedWithLocal(localFiles, repoFiles) {
  const repoPaths = new Set(repoFiles.map((f) => f.path))
  const pendingLocal = localFiles.filter((f) => f.path && !repoPaths.has(f.path))
  const fromRepo = repoFiles.map((f) => {
    const local = localFiles.find((l) => l.path === f.path)
    return {
      ...f,
      slug: local?.slug ?? publishedFileSlug(f),
      title: local?.title,
      excerpt: local?.excerpt,
      category: local?.category,
      url: local?.url,
      publishedAt: local?.publishedAt,
    }
  })
  return [...pendingLocal, ...fromRepo].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? '')),
  )
}

/**
 * Remove a deleted post from local list immediately (path, slug, or posts/slug.html href).
 * @param {Array<{ name: string, path: string }>} files
 * @param {{ slug: string, path: string, href: string }} deleted
 */
export function withoutDeletedPost(files, { slug, path, href }) {
  const hrefFile = href ? href.replace(/^posts\//, '') : ''
  return files.filter((post) => {
    const postSlug = publishedFileSlug(post)
    if (postSlug === slug) return false
    if (post.path === path) return false
    if (hrefFile && (post.name === hrefFile || post.path?.endsWith(`/${hrefFile}`))) return false
    return true
  })
}

/**
 * Keep slug in the blocklist only while the repo contents API still returns that file.
 * @param {string[]} recentlyDeleted
 * @param {Array<{ name: string, path: string }>} repoFiles
 */
export function pruneRecentlyDeletedSlugs(recentlyDeleted, repoFiles) {
  return recentlyDeleted.filter((slug) => {
    const path = postRepoPath(slug)
    return repoFiles.some((f) => f.path === path || publishedFileSlug(f) === slug)
  })
}

/** Sidebar entry after publish (compatible with GitHub listPostHtmlFiles shape). */
export function buildOptimisticPublishedFile({
  slug,
  title,
  excerpt,
  category,
  path,
  url,
  publishedAt,
}) {
  const safeSlug = String(slug ?? '').trim() || 'post'
  return {
    slug: safeSlug,
    title: String(title ?? '').trim() || 'Untitled',
    excerpt: String(excerpt ?? '').trim(),
    category: String(category ?? '').trim(),
    path: path || postRepoPath(safeSlug),
    url: url || `posts/${safeSlug}.html`,
    publishedAt: publishedAt || new Date().toISOString(),
    name: `${safeSlug}.html`,
    sha: null,
  }
}

/** Prepend or replace by slug/path (newest first). */
export function upsertPublishedPost(files, item) {
  const withoutExisting = files.filter(
    (post) =>
      publishedEntrySlug(post) !== item.slug &&
      post.path !== item.path &&
      post.slug !== item.slug,
  )
  return [item, ...withoutExisting]
}
