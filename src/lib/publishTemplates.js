import {
  postUrlForIndex,
  resolveBlogIndexPath,
  stylesheetHrefForPost,
} from './blogPaths'
import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { replaceTemplateVars } from './templateVars'
import { slugify } from './slugify'

export { postUrlForIndex, stylesheetHrefForPost }

export class PublishValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PublishValidationError'
  }
}

export function getPostCardTemplate() {
  return READ_ONLY_TEMPLATES.postCardTemplateHtml
}

export function getPostPageTemplate() {
  return READ_ONLY_TEMPLATES.postPageTemplateHtml
}

/** Default blog index path for a posts folder setting. */
export function resolvePublishIndexPath(postsPath, indexPagePath) {
  return resolveBlogIndexPath({ postsPath, indexPagePath })
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
 *   stylesheetHref?: string,
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
  const stylesheet =
    input.stylesheetHref?.trim() || stylesheetHrefForPost(postRepoPath)

  return {
    TITLE: title || 'Untitled',
    SLUG: slug,
    URL: url,
    DATE: formatPublishDate(input.date ?? new Date()),
    CATEGORY: category,
    CATEGORY_CLASS: categoryClass,
    EXCERPT: String(input.excerpt ?? '').trim(),
    CONTENT: input.content ?? '',
    STYLESHEET: stylesheet,
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
