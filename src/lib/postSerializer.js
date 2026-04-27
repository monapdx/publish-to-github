import { applyTemplate } from './templates'

/**
 * Build the final publishable HTML document.
 * @param {{ title: string, content: string, excerpt?: string, templateId?: string }} input
 */
export function serializePost({ title, content, excerpt = '', templateId = 'default' }) {
  return applyTemplate(templateId, { title, content, excerpt })
}

function metaContent(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"]`)
  const v = el?.getAttribute('content')
  return typeof v === 'string' ? v : ''
}

/**
 * Extract title, excerpt, and post body HTML from a published full-page document.
 * Prefers `blog-editor:*` meta tags when present (accurate round-trip from this app).
 * @param {string} html
 * @returns {{ title: string, excerpt: string, content: string }}
 */
export function parsePublishedHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const metaTitle = metaContent(doc, 'blog-editor:title').trim()
  const metaExcerpt = metaContent(doc, 'blog-editor:excerpt').trim()

  const domTitle =
    doc.querySelector('main.blog-post h1')?.textContent?.trim() ||
    doc.querySelector('main h1')?.textContent?.trim() ||
    doc.querySelector('article h1')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.trim() ||
    'Untitled'

  const title = metaTitle || domTitle

  const excerpt = metaExcerpt || metaContent(doc, 'description').trim()

  let content = ''

  const article =
    doc.querySelector('main article') ||
    doc.querySelector('article[role="article"]') ||
    doc.querySelector('[role="article"]') ||
    doc.querySelector('article')
  if (article) {
    const inner = article.innerHTML?.trim()
    content = inner ? article.innerHTML : '<p></p>'
    return { title, excerpt, content }
  }

  const main = doc.querySelector('main.blog-post') || doc.querySelector('main')
  if (main instanceof HTMLElement) {
    const clone = main.cloneNode(true)
    const h = clone.querySelector('h1')
    h?.remove()
    const inner = clone.innerHTML?.trim()
    if (inner) {
      content = clone.innerHTML
      return { title, excerpt, content }
    }
  }

  const body = doc.body
  if (body) {
    const inner = body.innerHTML?.trim()
    if (inner) {
      content = body.innerHTML
      return { title, excerpt, content }
    }
  }

  return { title, excerpt, content: '<p></p>' }
}
