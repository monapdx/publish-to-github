/**
 * Code-mode “post template” panel (preview + localStorage only).
 * Publishing always uses templates/post-page-template.html via publishTemplates.js.
 */
import { getPostPageTemplate } from './publishTemplates'

const STORAGE_KEY = 'blog-editor-post-template-html'

export const DEFAULT_POST_TEMPLATE_HTML = getPostPageTemplate()

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Preview-only wrapper ({{title}} / {{content}} placeholders). Not used when publishing to GitHub. */
export function applyPostTemplate(templateHtml, {
  title,
  content,
  excerpt = '',
  category = '',
  slug = '',
  date = '',
}) {
  const safeTitle = escapeHtml(title)
  const safeExcerpt = escapeHtml(excerpt ?? '')
  const safeCategory = escapeHtml(category ?? '')
  const safeSlug = escapeHtml(slug ?? '')
  const safeDate = escapeHtml(date ?? '')
  return String(templateHtml)
    .replaceAll('{{title}}', safeTitle)
    .replaceAll('{{TITLE}}', safeTitle)
    .replaceAll('{{excerpt}}', safeExcerpt)
    .replaceAll('{{EXCERPT}}', safeExcerpt)
    .replaceAll('{{category}}', safeCategory)
    .replaceAll('{{CATEGORY}}', safeCategory)
    .replaceAll('{{slug}}', safeSlug)
    .replaceAll('{{SLUG}}', safeSlug)
    .replaceAll('{{date}}', safeDate)
    .replaceAll('{{DATE}}', safeDate)
    .replaceAll('{{content}}', content ?? '')
    .replaceAll('{{CONTENT}}', content ?? '')
}

export function loadPostTemplate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw.trim() === '') return DEFAULT_POST_TEMPLATE_HTML
    // Replace stale minimal templates saved before the bundled full-page shell.
    if (!raw.includes('nb-nav') || !raw.includes('<footer')) {
      return DEFAULT_POST_TEMPLATE_HTML
    }
    return raw
  } catch {
    return DEFAULT_POST_TEMPLATE_HTML
  }
}

export function persistPostTemplate(html) {
  try {
    localStorage.setItem(STORAGE_KEY, html)
  } catch {
    // ignore
  }
}
