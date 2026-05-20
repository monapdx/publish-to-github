import { POST_STYLESHEET_HREF, postHref } from './blogPaths'
import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { replaceTemplateVars } from './templateVars'
import { slugify } from './slugify'

export class PublishValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PublishValidationError'
  }
}

function formatDate(d = new Date()) {
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
  } catch {
    return String(d)
  }
}

export function buildPublishTemplateData({ title, slug, content, excerpt, category, categoryClass, date }) {
  const t = String(title ?? '').trim()
  const s = String(slug ?? '').trim() || slugify(t) || 'post'

  return {
    TITLE: t || 'Untitled',
    SLUG: s,
    URL: postHref(s),
    DATE: formatDate(date ?? new Date()),
    CATEGORY: String(category ?? '').trim(),
    CATEGORY_CLASS: String(categoryClass ?? '').trim() || 'nb-bg-pink',
    EXCERPT: String(excerpt ?? '').trim(),
    CONTENT: content ?? '',
    STYLESHEET: POST_STYLESHEET_HREF,
  }
}

export function renderPostCardHtml(data) {
  return replaceTemplateVars(READ_ONLY_TEMPLATES.postCardTemplateHtml, data)
}

export function renderPostPageHtml(data) {
  return replaceTemplateVars(READ_ONLY_TEMPLATES.postPageTemplateHtml, data)
}

export function validatePublishInputs({ title, content, slug }) {
  const t = String(title ?? '').trim()
  const c = String(content ?? '').trim()
  const s = String(slug ?? '').trim() || slugify(t)

  if (!t) throw new PublishValidationError('Add a title before publishing.')
  if (!c || c === '<p></p>') throw new PublishValidationError('Add some post content before publishing.')
  if (!s) throw new PublishValidationError('Add a slug (or title) before publishing.')
  if (!READ_ONLY_TEMPLATES.postCardTemplateHtml.trim()) {
    throw new PublishValidationError('Missing post-card template.')
  }
  if (!READ_ONLY_TEMPLATES.postPageTemplateHtml.trim()) {
    throw new PublishValidationError('Missing post-page template.')
  }

  return { title: t, content: c, slug: s }
}
