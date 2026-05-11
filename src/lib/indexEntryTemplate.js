const STORAGE_KEY = 'blog-editor-index-entry-template'

export const DEFAULT_INDEX_ENTRY_TEMPLATE = `<article class="post-card">
  <h2><a href="{{url}}">{{title}}</a></h2>
  <p>{{excerpt}}</p>
  <time datetime="{{dateIso}}">{{date}}</time>
</article>
`

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Fill the homepage post-card template. User HTML is escaped except {{content}} (not used by default).
 * @param {string} templateHtml
 * @param {{ title: string, excerpt?: string, date?: string, slug?: string, fileName: string, category?: string }} ctx
 */
export function applyIndexEntryTemplate(templateHtml, ctx) {
  const title = ctx.title ?? 'Untitled'
  const excerpt = ctx.excerpt ?? ''
  const dateRaw = ctx.date ?? ''
  const slug = (ctx.slug ?? ctx.fileName.replace(/\.html$/i, '')).trim()
  const fileName = ctx.fileName.trim()
  const category = ctx.category ?? ''

  let dateDisplay = ''
  try {
    if (dateRaw) {
      dateDisplay = new Date(dateRaw).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    }
  } catch {
    dateDisplay = dateRaw
  }

  const iso = dateRaw || ''
  const human = dateDisplay || iso

  return String(templateHtml)
    .replaceAll('{{title}}', escapeHtml(title))
    .replaceAll('{{excerpt}}', escapeHtml(excerpt))
    .replaceAll('{{dateIso}}', escapeHtml(iso))
    .replaceAll('{{date}}', escapeHtml(human))
    .replaceAll('{{slug}}', escapeHtml(slug))
    .replaceAll('{{url}}', escapeHtml(fileName))
    .replaceAll('{{category}}', escapeHtml(category))
}

export function loadIndexEntryTemplate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw.trim() === '') return DEFAULT_INDEX_ENTRY_TEMPLATE
    return raw
  } catch {
    return DEFAULT_INDEX_ENTRY_TEMPLATE
  }
}

export function persistIndexEntryTemplate(html) {
  try {
    localStorage.setItem(STORAGE_KEY, html)
  } catch {
    // ignore
  }
}
