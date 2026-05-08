const START = '<!-- BLOG_EDITOR_POSTS_START -->'
const END = '<!-- BLOG_EDITOR_POSTS_END -->'

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function normalizePostsDirectory(postsPath) {
  if (!postsPath || typeof postsPath !== 'string') return 'blog'
  let s = postsPath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  s = s.replace(/\/+$/, '')
  return s || 'blog'
}

function indexPathForPostsPath(postsPath) {
  const dir = normalizePostsDirectory(postsPath)
  return `${dir}/index.html`
}

function buildPostListItem({ fileName, title, excerpt, date }) {
  const safeTitle = escapeHtml(title)
  const safeExcerpt = escapeHtml(excerpt || '')
  const safeDate = escapeHtml(date || '')

  const excerptHtml = safeExcerpt ? `\n      <p class="post-excerpt">${safeExcerpt}</p>` : ''
  const dateHtml = safeDate ? `\n      <time class="post-date" datetime="${safeDate}">${safeDate}</time>` : ''

  return `    <li class="post-item" data-slug="${escapeHtml(fileName.replace(/\.html$/i, ''))}">
      <a class="post-link" href="./${escapeHtml(fileName)}">${safeTitle}</a>${dateHtml}${excerptHtml}
    </li>`
}

function ensureMarkerBlock(html, listHtml) {
  if (html.includes(START) && html.includes(END)) {
    return replaceMarkerBlock(html, listHtml)
  }

  const block = `${START}
  <ul class="blog-index">
${listHtml}
  </ul>
${END}`

  if (html.includes('</main>')) {
    return html.replace('</main>', `\n${block}\n</main>`)
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', `\n${block}\n</body>`)
  }
  return `${html}\n${block}\n`
}

function replaceMarkerBlock(html, listHtml) {
  const startIdx = html.indexOf(START)
  const endIdx = html.indexOf(END)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return html

  const before = html.slice(0, startIdx + START.length)
  const after = html.slice(endIdx)

  // Keep user's wrapper structure; replace between markers with a UL.
  const middle = `\n  <ul class="blog-index">\n${listHtml}\n  </ul>\n`
  return `${before}${middle}${after}`
}

function upsertListItem(existingListHtml, newItemHtml, fileName) {
  const hrefNeedle = `href="./${fileName}"`
  const lines = String(existingListHtml || '')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '')

  // Remove any existing LI that contains the same href (simple but robust).
  const filtered = []
  let skipping = false
  for (const line of lines) {
    if (!skipping && line.includes('<li') && line.includes(hrefNeedle)) {
      skipping = true
      continue
    }
    if (skipping) {
      if (line.includes('</li>')) skipping = false
      continue
    }
    filtered.push(line)
  }

  return [newItemHtml, ...filtered].join('\n')
}

function extractListHtmlBetweenMarkers(html) {
  const startIdx = html.indexOf(START)
  const endIdx = html.indexOf(END)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return ''
  const inner = html.slice(startIdx + START.length, endIdx)
  // Try to pull LI lines from inside existing UL if present; else return full inner.
  const liMatches = inner.match(/<li[\s\S]*?<\/li>/g)
  if (liMatches && liMatches.length > 0) return liMatches.join('\n')
  return inner.trim()
}

export function getIndexPath(postsPath) {
  return indexPathForPostsPath(postsPath)
}

/**
 * Build updated index.html content with the new/updated post entry.
 * @param {{ indexHtml: string, fileName: string, title: string, excerpt: string, date: string }} input
 */
export function updateIndexHtml({ indexHtml, fileName, title, excerpt, date }) {
  const existingList = extractListHtmlBetweenMarkers(indexHtml)
  const newItem = buildPostListItem({ fileName, title, excerpt, date })
  const nextList = upsertListItem(existingList, newItem, fileName)
  return ensureMarkerBlock(indexHtml, nextList)
}

export function defaultIndexHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog</title>
</head>
<body>
  <main class="blog-index-page">
    <h1>Blog</h1>
${START}
  <ul class="blog-index">
  </ul>
${END}
  </main>
</body>
</html>
`
}

