const TEMPLATES = {
  default: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <meta name="blog-editor:title" content="{{title}}" />
  <meta name="blog-editor:excerpt" content="{{excerpt}}" />
  <link rel="stylesheet" href="/styles/blog.css" />
</head>
<body>
  <main class="blog-post">
    <h1>{{title}}</h1>
    <article>
      {{content}}
    </article>
  </main>
</body>
</html>`,
  minimal: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <meta name="blog-editor:title" content="{{title}}" />
  <meta name="blog-editor:excerpt" content="{{excerpt}}" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    .blog-image { max-width: 100%; height: auto; }
    .align-center { display: block; margin: 1rem auto; }
    .align-left { float: left; margin: 0 1rem 1rem 0; }
    .align-right { float: right; margin: 0 0 1rem 1rem; }
  </style>
</head>
<body>
  <main class="blog-post">
    <h1>{{title}}</h1>
    <article>{{content}}</article>
  </main>
</body>
</html>`,
}

export const TEMPLATE_OPTIONS = [
  { id: 'default', label: 'Full page (site CSS)' },
  { id: 'minimal', label: 'Full page (inline styles)' },
]

/**
 * @param {string} templateId
 * @param {{ title: string, content: string, excerpt?: string }} vars
 */
export function applyTemplate(templateId, { title, content, excerpt = '' }) {
  const raw = TEMPLATES[templateId] ?? TEMPLATES.default
  const safeTitle = escapeHtml(title)
  const safeExcerpt = escapeHtml(excerpt ?? '')
  return raw
    .replaceAll('{{title}}', safeTitle)
    .replaceAll('{{excerpt}}', safeExcerpt)
    .replaceAll('{{content}}', content ?? '')
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
