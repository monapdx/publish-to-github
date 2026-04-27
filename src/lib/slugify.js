/**
 * Convert a title into a URL-safe slug.
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}
