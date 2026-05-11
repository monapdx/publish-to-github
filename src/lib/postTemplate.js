const STORAGE_KEY = 'blog-editor-post-template-html'

export const DEFAULT_POST_TEMPLATE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <meta name="description" content="{{excerpt}}" />
  <meta name="blog-editor:category" content="{{category}}" />
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <main class="blog-post">
    <h1>{{title}}</h1>
    <article>
      {{content}}
    </article>
  </main>
</body>
</html>
`

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

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
    .replaceAll('{{excerpt}}', safeExcerpt)
    .replaceAll('{{category}}', safeCategory)
    .replaceAll('{{slug}}', safeSlug)
    .replaceAll('{{date}}', safeDate)
    .replaceAll('{{content}}', content ?? '')
}

export function loadPostTemplate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw.trim() === '') return DEFAULT_POST_TEMPLATE_HTML
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
