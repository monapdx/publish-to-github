import { applyPostTemplate, DEFAULT_POST_TEMPLATE_HTML } from './postTemplate'
import { sanitizePublishedBodyHtml } from './sanitizeHtml'

/**
 * Build the final publishable HTML document.
 * @param {{
 *   title: string,
 *   content: string,
 *   excerpt?: string,
 *   category?: string,
 *   slug?: string,
 *   date?: string,
 *   templateHtml?: string,
 * }} input
 */
export function serializePost({
  title,
  content,
  excerpt = '',
  category = '',
  slug = '',
  date,
  templateHtml,
}) {
  const tpl =
    typeof templateHtml === 'string' && templateHtml.trim()
      ? templateHtml
      : DEFAULT_POST_TEMPLATE_HTML
  const publishedDate =
    typeof date === 'string' && date.trim()
      ? date.trim()
      : new Date().toISOString()
  return applyPostTemplate(tpl, {
    title,
    content,
    excerpt,
    category,
    slug,
    date: publishedDate,
  })
}

function metaContent(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"]`)
  const v = el?.getAttribute('content')
  return typeof v === 'string' ? v : ''
}

/**
 * Extract title, excerpt, category, and post body HTML from a published full-page document.
 * Prefers `blog-editor:*` meta tags when present (accurate round-trip from this app).
 * @param {string} html
 * @returns {{ title: string, excerpt: string, category: string, content: string }}
 */
export function parsePublishedHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const metaTitle = metaContent(doc, 'blog-editor:title').trim()
  const metaExcerpt = metaContent(doc, 'blog-editor:excerpt').trim()
  const metaCategory = metaContent(doc, 'blog-editor:category').trim()

  const domTitle =
    doc.querySelector('main.blog-post h1')?.textContent?.trim() ||
    doc.querySelector('main h1')?.textContent?.trim() ||
    doc.querySelector('article h1')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.trim() ||
    'Untitled'

  const title = metaTitle || domTitle

  const excerpt = metaExcerpt || metaContent(doc, 'description').trim()
  const category = metaCategory

  let content = ''

  const article =
    doc.querySelector('main article') ||
    doc.querySelector('article[role="article"]') ||
    doc.querySelector('[role="article"]') ||
    doc.querySelector('article')
  if (article) {
    const inner = article.innerHTML?.trim()
    content = inner ? sanitizePublishedBodyHtml(article.innerHTML) : '<p></p>'
    return { title, excerpt, category, content }
  }

  const main = doc.querySelector('main.blog-post') || doc.querySelector('main')
  if (main instanceof HTMLElement) {
    const clone = main.cloneNode(true)
    const h = clone.querySelector('h1')
    h?.remove()
    const inner = clone.innerHTML?.trim()
    if (inner) {
      content = sanitizePublishedBodyHtml(clone.innerHTML)
      return { title, excerpt, category, content }
    }
  }

  const body = doc.body
  if (body) {
    const inner = body.innerHTML?.trim()
    if (inner) {
      content = sanitizePublishedBodyHtml(body.innerHTML)
      return { title, excerpt, category, content }
    }
  }

  return { title, excerpt, category, content: '<p></p>' }
}
