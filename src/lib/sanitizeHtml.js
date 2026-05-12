import DOMPurify from 'dompurify'

/** DOMPurify options tuned for TipTap / prose HTML loaded from published files. */
const PUBLISHED_BODY_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: [
    'target',
    'rel',
    'class',
    'style',
    'width',
    'height',
    'colspan',
    'rowspan',
    'align',
    'datetime',
    'controls',
    'controlslist',
    'preload',
    'download',
    'data-type',
    'data-id',
    'data-label',
    'data-checked',
    'data-href',
    'data-align',
    'reference',
    'start',
  ],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
}

/**
 * Sanitize HTML that will be injected into the editor as document HTML.
 * Reduces stored-XSS risk when opening repo files that contain hostile markup.
 * @param {string} html
 */
export function sanitizePublishedBodyHtml(html) {
  const dirty = String(html ?? '')
  if (!dirty.trim()) return '<p></p>'
  const clean = DOMPurify.sanitize(dirty, PUBLISHED_BODY_CONFIG)
  return clean.trim() ? clean : '<p></p>'
}
