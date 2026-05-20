/** Keys whose values are inserted as raw HTML (editor output). */
const RAW_HTML_KEYS = new Set(['CONTENT', 'content'])

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Replace {{KEY}} placeholders in a template string.
 * Plain-text fields are HTML-escaped; CONTENT is left as-is.
 *
 * @param {string} template
 * @param {Record<string, string>} data
 */
export function replaceTemplateVars(template, data) {
  let out = String(template)
  for (const [key, value] of Object.entries(data)) {
    const upper = key.toUpperCase()
    const lower = key.toLowerCase()
    const safe = RAW_HTML_KEYS.has(upper) || RAW_HTML_KEYS.has(key) ? String(value ?? '') : escapeHtml(value ?? '')
    out = out.replaceAll(`{{${upper}}}`, safe)
    out = out.replaceAll(`{{${lower}}}`, safe)
    out = out.replaceAll(`{{${key}}}`, safe)
  }
  return out
}
