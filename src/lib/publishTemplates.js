import { POST_STYLESHEET_HREF, postHref } from './blogPaths'
import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { replaceTemplateVars } from './templateVars'
import { slugify } from './slugify'

/** Bundled marker — must appear in every published blog/posts/*.html file. */
export const POST_PAGE_TEMPLATE_MARKER = 'POST PAGE TEMPLATE ACTIVE'

export class PublishValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PublishValidationError'
  }
}

/**
 * Full-page template for blog/posts/{slug}.html (templates/post-page-template.html).
 * Publish path: publishPipeline → renderPostPageHtml → getPostPageTemplate → this string.
 */
export function getPostPageTemplate() {
  return READ_ONLY_TEMPLATES.postPageTemplateHtml
}

export function getPostCardTemplate() {
  return READ_ONLY_TEMPLATES.postCardTemplateHtml
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

/**
 * Renders blog/posts/{slug}.html from templates/post-page-template.html only.
 */
export function renderPostPageHtml(data) {
  const html = replaceTemplateVars(getPostPageTemplate(), data)
  assertRenderedPostPage(html)
  return html
}

export function renderPostCardHtml(data) {
  return replaceTemplateVars(getPostCardTemplate(), data)
}

/** Ensures publish output used the bundled full-page template, not a stale/minimal fallback. */
export function assertRenderedPostPage(html) {
  const h = String(html)
  const missing = []
  if (!h.includes(POST_PAGE_TEMPLATE_MARKER)) missing.push(POST_PAGE_TEMPLATE_MARKER)
  if (!h.includes('<nav class="nb-nav">')) missing.push('header (nb-nav)')
  if (!h.includes('<footer class="nb-section">')) missing.push('footer')
  if (!h.includes('href="../style.css"')) missing.push('stylesheet ../style.css')
  if (!h.includes('href="../index.html"')) missing.push('home link ../index.html')
  if (!h.includes('class="nb-card nb-stack-md blog-post"')) missing.push('post article')
  if (missing.length) {
    throw new PublishValidationError(
      `Post page was not built from templates/post-page-template.html (missing: ${missing.join(', ')}). ` +
        'Stop and restart the dev server (npm run dev), then publish again.',
    )
  }
}

export function validatePublishInputs({ title, content, slug }) {
  const t = String(title ?? '').trim()
  const c = String(content ?? '').trim()
  const s = String(slug ?? '').trim() || slugify(t)

  if (!t) throw new PublishValidationError('Add a title before publishing.')
  if (!c || c === '<p></p>') throw new PublishValidationError('Add some post content before publishing.')
  if (!s) throw new PublishValidationError('Add a slug (or title) before publishing.')

  const pageTpl = getPostPageTemplate().trim()
  if (!pageTpl) {
    throw new PublishValidationError('Missing templates/post-page-template.html (empty bundle).')
  }
  if (!pageTpl.includes(POST_PAGE_TEMPLATE_MARKER)) {
    throw new PublishValidationError(
      'Bundled post-page template is outdated. Restart npm run dev and try again.',
    )
  }
  if (!getPostCardTemplate().trim()) {
    throw new PublishValidationError('Missing templates/post-card-template.html.')
  }

  return { title: t, content: c, slug: s }
}
