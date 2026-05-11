const START = '<!-- BLOG_EDITOR_POSTS_START -->'
const END = '<!-- BLOG_EDITOR_POSTS_END -->'

const DEFAULT_LABEL_CLASS = 'nb-bg-pink'
const DEFAULT_BUTTON_CLASS = 'nb-btn-green'
const READ_POST_LABEL = 'Read Post'

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function decodeHtmlEntities(s) {
  return String(s)
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&')
}

function stripHtmlTags(s) {
  return String(s).replace(/<[^>]+>/g, '')
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

/**
 * Build an <article class="nb-card"> card matching the site's neo-brutalist
 * blog template. The button + label colors are intentionally fixed so cards
 * look consistent across posts.
 */
function buildPostCard({ fileName, title, excerpt, category }) {
  const safeTitle = escapeHtml(title || 'Untitled')
  const safeExcerpt = escapeHtml(excerpt || '')
  const categoryText =
    category != null && String(category).trim() !== '' ? String(category).trim() : ''
  const safeCategory = escapeHtml(categoryText)
  const safeHref = escapeHtml(fileName)
  const safeSlug = escapeHtml(fileName.replace(/\.html$/i, ''))

  const labelLine = safeCategory
    ? `\n            <span class="nb-label ${DEFAULT_LABEL_CLASS}">${safeCategory}</span>`
    : ''

  return `          <article class="nb-card nb-stack-sm" data-slug="${safeSlug}">${labelLine}
            <h3>${safeTitle}</h3>
            <p>${safeExcerpt}</p>
            <a href="${safeHref}" class="nb-btn ${DEFAULT_BUTTON_CLASS}">${READ_POST_LABEL}</a>
          </article>`
}

/**
 * Turn a legacy <li class="post-item"> block into the same nb-card article used for new posts.
 * No category is inferred — the rewritten card has no nb-label span until the post is
 * re-published with a category set in the editor.
 */
function legacyListItemToCard(liBlock) {
  const hrefMatch = liBlock.match(/href\s*=\s*["'](?:\.\/)?([^"']+\.html)["']/i)
  if (!hrefMatch) return null
  const fileName = hrefMatch[1].trim().split('/').pop() || ''
  if (!fileName) return null

  const linkMatch = liBlock.match(
    /<a\b[^>]*\bclass\s*=\s*["'][^"']*post-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
  )
  const linkMatchAlt = liBlock.match(
    /<a\b[^>]*\bhref\s*=\s*["'](?:\.\/)?[^"']+\.html["'][^>]*>([\s\S]*?)<\/a>/i,
  )
  const rawTitle = (linkMatch || linkMatchAlt)?.[1] ?? ''
  const title = decodeHtmlEntities(stripHtmlTags(rawTitle)).trim() || 'Untitled'

  const excerptMatch = liBlock.match(/<p\b[^>]*\bpost-excerpt\b[^>]*>([\s\S]*?)<\/p>/i)
  const excerpt = excerptMatch
    ? decodeHtmlEntities(stripHtmlTags(excerptMatch[1])).trim()
    : ''

  return buildPostCard({ fileName, title, excerpt, category: '' })
}

function normalizePostBlock(block) {
  const t = String(block).trim()
  if (/^<article\b/i.test(t)) return block
  if (/<li\b[^>]*\bpost-item\b/i.test(t)) {
    const converted = legacyListItemToCard(t)
    return converted || block
  }
  return block
}

function extractInner(html) {
  const startIdx = html.indexOf(START)
  const endIdx = html.indexOf(END)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return ''
  return html.slice(startIdx + START.length, endIdx)
}

/** Pull each item block (either <article>…</article> or <li>…</li>) out of inner text. */
function extractItems(inner) {
  const blocks = []
  const re = /<(article|li)\b[\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(inner)) !== null) {
    blocks.push(m[0])
  }
  return blocks
}

/**
 * True if the given <article>/<li> block's href targets the given file name.
 * Accepts both bare ("post.html") and dot-prefixed ("./post.html") hrefs.
 */
function blockTargetsFile(blockHtml, fileName) {
  const safe = escapeRegExp(fileName)
  const re = new RegExp(`href\\s*=\\s*["'](?:\\.\\/)?${safe}["']`, 'i')
  return re.test(blockHtml)
}

function replaceInnerBetweenMarkers(html, innerBody) {
  const startIdx = html.indexOf(START)
  const endIdx = html.indexOf(END)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return html
  const before = html.slice(0, startIdx + START.length)
  const after = html.slice(endIdx)
  return `${before}\n${innerBody}\n${after}`
}

function injectFreshMarkerBlock(html, innerBody) {
  const block = `${START}\n${innerBody}\n${END}`
  if (html.includes('</main>')) {
    return html.replace('</main>', `${block}\n</main>`)
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', `${block}\n</body>`)
  }
  return `${html}\n${block}\n`
}

export function getIndexPath(postsPath) {
  return indexPathForPostsPath(postsPath)
}

/**
 * Build the updated index.html content with the new/updated post entry.
 *
 * Behavior:
 *   - If START/END markers are present, items between them are kept and the
 *     new entry is prepended (any existing entry pointing to the same file is
 *     removed first). Entries are always neo-brutalist <article class="nb-card">
 *     cards; legacy <li class="post-item"> blocks are converted to that shape.
 *   - If markers are missing, a fresh marker block is injected near </main>
 *     or </body> using the same <article> card format.
 *
 * @param {{
 *   indexHtml: string,
 *   fileName: string,
 *   title: string,
 *   excerpt?: string,
 *   date?: string,
 *   category?: string,
 * }} input
 */
export function updateIndexHtml({ indexHtml, fileName, title, excerpt, date, category }) {
  void date
  const hasMarkers = indexHtml.includes(START) && indexHtml.includes(END)
  const inner = hasMarkers ? extractInner(indexHtml) : ''

  const existingItems = extractItems(inner)
    .filter((block) => !blockTargetsFile(block, fileName))
    .map(normalizePostBlock)

  const newItem = buildPostCard({ fileName, title, excerpt, category })

  const innerBody = [newItem, ...existingItems].join('\n')

  if (hasMarkers) {
    return replaceInnerBetweenMarkers(indexHtml, innerBody)
  }
  return injectFreshMarkerBlock(indexHtml, innerBody)
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
    <section class="nb-cards">
${START}
${END}
    </section>
  </main>
</body>
</html>
`
}
