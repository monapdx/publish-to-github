import postCardTemplateRaw from '../../templates/post-card-template.html?raw'
import postPageTemplateRaw from '../../templates/post-page-template.html?raw'
import { replaceTemplateVars } from './templateVars'
import { slugify } from './slugify'
import { repoPathDepth } from './indexPagePath'

export class PublishValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PublishValidationError'
  }
}

export function getPostCardTemplate() {
  return postCardTemplateRaw
}

export function getPostPageTemplate() {
  return postPageTemplateRaw
}

/** Stylesheet path from a post file to site root (e.g. blog/post.html → ../styles.css). */
export function stylesheetHrefForPost(postRepoPath) {
  const depth = repoPathDepth(postRepoPath)
  if (depth <= 0) return 'styles.css'
  return `${'../'.repeat(depth)}styles.css`
}

/**
 * Href for index page links to a post (same folder → slug.html only).
 * @param {string} postRepoPath e.g. blog/my-post.html
 * @param {string} indexRepoPath e.g. blog/index.html
 */
export function postUrlForIndex(postRepoPath, indexRepoPath) {
  const postFile = postRepoPath.split('/').pop() || `${postRepoPath}.html`
  const postDir = postRepoPath.includes('/') ? postRepoPath.replace(/\/[^/]+$/, '') : ''
  const indexDir = indexRepoPath.includes('/') ? indexRepoPath.replace(/\/[^/]+$/, '') : ''
  if (postDir === indexDir) return postFile
  if (!indexDir) return postRepoPath
  return postRepoPath
}

function formatPublishDate(isoOrDate = new Date()) {
  try {
    return new Date(isoOrDate).toLocaleString(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    })
  } catch {
    return String(isoOrDate)
  }
}

/**
 * @param {{
 *   title: string,
 *   slug?: string,
 *   content: string,
 *   excerpt?: string,
 *   category?: string,
 *   categoryClass?: string,
 *   postRepoPath: string,
 *   indexRepoPath: string,
 *   date?: string | Date,
 * }} input
 */
export function buildPublishTemplateData(input) {
  const title = String(input.title ?? '').trim()
  const slug = String(input.slug ?? '').trim() || slugify(title) || 'post'
  const postRepoPath = input.postRepoPath
  const indexRepoPath = input.indexRepoPath
  const url = postUrlForIndex(postRepoPath, indexRepoPath)
  const category = String(input.category ?? '').trim()
  const categoryClass = String(input.categoryClass ?? '').trim() || 'nb-bg-pink'

  return {
    TITLE: title || 'Untitled',
    SLUG: slug,
    URL: url,
    DATE: formatPublishDate(input.date ?? new Date()),
    CATEGORY: category,
    CATEGORY_CLASS: categoryClass,
    EXCERPT: String(input.excerpt ?? '').trim(),
    CONTENT: input.content ?? '',
    STYLESHEET: stylesheetHrefForPost(postRepoPath),
  }
}

export function renderPostCardHtml(data) {
  return replaceTemplateVars(getPostCardTemplate(), data)
}

export function renderPostPageHtml(data) {
  return replaceTemplateVars(getPostPageTemplate(), data)
}

/**
 * @param {{ title: string, content: string, slug?: string }} post
 */
export function validatePublishInputs(post) {
  const title = String(post.title ?? '').trim()
  const content = String(post.content ?? '').trim()
  const slug = String(post.slug ?? '').trim() || slugify(title)

  if (!title) throw new PublishValidationError('Add a title before publishing.')
  if (!content || content === '<p></p>') {
    throw new PublishValidationError('Add some post content before publishing.')
  }
  if (!slug) throw new PublishValidationError('Add a slug (or title) before publishing.')

  if (!getPostCardTemplate().trim()) {
    throw new PublishValidationError('Missing templates/post-card-template.html.')
  }
  if (!getPostPageTemplate().trim()) {
    throw new PublishValidationError('Missing templates/post-page-template.html.')
  }

  return { title, content, slug }
}
