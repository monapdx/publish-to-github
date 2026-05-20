import { applyIndexEntryTemplate } from './indexEntryTemplate'

/** Primary markers (template publishing). */
export const MARKER_START = '<!-- BLOG_POSTS_START -->'
export const MARKER_END = '<!-- BLOG_POSTS_END -->'

/** @deprecated Hyphenated variant still recognized */
const MARKER_HYPHEN_START = '<!-- BLOG-POSTS-START -->'
const MARKER_HYPHEN_END = '<!-- BLOG-POSTS-END -->'

/** @deprecated Legacy editor markers */
const LEGACY_START = '<!-- BLOG_EDITOR_POSTS_START -->'
const LEGACY_END = '<!-- BLOG_EDITOR_POSTS_END -->'

export const MARKER_BLOCK_SNIPPET = `${MARKER_START}\n${MARKER_END}`

const DEFAULT_READ_POST_LABEL = 'Read Post'
const DEFAULT_LABEL_CLASS = 'nb-bg-pink'
const DEFAULT_BUTTON_CLASS = 'nb-btn-green'

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

function countSubstr(str, sub) {
  if (!sub) return 0
  let c = 0
  let i = 0
  while (true) {
    const j = str.indexOf(sub, i)
    if (j === -1) break
    c += 1
    i = j + sub.length
  }
  return c
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
 * Build legacy neo-brutalist card (used when converting old &lt;li&gt; blocks inside the marker region).
 */
function buildLegacyNbCard({ fileName, title, excerpt, category }) {
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
            <a href="${safeHref}" class="nb-btn ${DEFAULT_BUTTON_CLASS}">${DEFAULT_READ_POST_LABEL}</a>
          </article>`
}

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

  return buildLegacyNbCard({ fileName, title, excerpt, category: '' })
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

/** @param {string} inner HTML between marker comments */
export function extractListingBlocks(inner) {
  const blocks = []
  const re = /<(article|li)\b[\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(inner)) !== null) {
    blocks.push(m[0])
  }
  return blocks
}

/**
 * @param {string} html full index page
 * @returns {string | null} inner HTML between markers when valid
 */
export function getMarkerRegionInner(html) {
  const analysis = analyzeIndexMarkers(html)
  if (analysis.kind !== 'ok') return null
  const { startStr, startIdx, endIdx } = analysis
  return html.slice(startIdx + startStr.length, endIdx)
}

function blockTargetsFile(blockHtml, fileName) {
  const safe = escapeRegExp(fileName)
  const re = new RegExp(`href\\s*=\\s*["'](?:\\.\\/)?${safe}["']`, 'i')
  return re.test(blockHtml)
}

/** @param {string} blockHtml
 * @param {string} slug */
export function blockTargetsSlug(blockHtml, slug) {
  const safe = escapeRegExp(slug)
  return new RegExp(`data-slug\\s*=\\s*["']${safe}["']`, 'i').test(blockHtml)
}

function replaceInnerBetweenMarkers(html, innerBody, startStr, endStr, startIdx, endIdx) {
  const before = html.slice(0, startIdx + startStr.length)
  const after = html.slice(endIdx)
  return `${before}\n${innerBody}\n${after}`
}

export function getIndexPath(postsPath) {
  return indexPathForPostsPath(postsPath)
}

/**
 * Inspect homepage HTML for valid marker comments (new or legacy).
 * @returns {{ kind: 'ok', startStr: string, endStr: string, startIdx: number, endIdx: number } | { kind: string, message: string }}
 */
function markerPairOk(text, startStr, endStr, label) {
  const nS = countSubstr(text, startStr)
  const nE = countSubstr(text, endStr)
  if (nS > 1 || nE > 1) {
    return {
      kind: 'duplicate',
      message: `More than one copy of ${label} was found. Keep exactly one start and one end marker.`,
    }
  }
  if (nS === 1 && nE === 1) {
    const startIdx = text.indexOf(startStr)
    const endIdx = text.indexOf(endStr)
    if (endIdx <= startIdx) {
      return { kind: 'order', message: 'The start marker must appear earlier in the file than the end marker.' }
    }
    return { kind: 'ok', startStr, endStr, startIdx, endIdx }
  }
  if (nS > 0 || nE > 0) {
    return { kind: 'partial', message: `Only one of the ${label} marker comments was found.` }
  }
  return null
}

export function analyzeIndexMarkers(html) {
  const text = String(html ?? '')

  for (const [startStr, endStr, label] of [
    [MARKER_START, MARKER_END, 'BLOG_POSTS'],
    [MARKER_HYPHEN_START, MARKER_HYPHEN_END, 'BLOG-POSTS'],
    [LEGACY_START, LEGACY_END, 'legacy BLOG_EDITOR'],
  ]) {
    const r = markerPairOk(text, startStr, endStr, label)
    if (r) return r
  }

  return {
    kind: 'missing',
    message:
      'No marker comments were found. Add <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> around your post card list.',
  }
}

/**
 * Wrap an existing nb-cards section (or first nb-card block) with markers when missing.
 * @returns {{ html: string, added: boolean }}
 */
export function ensureBlogPostMarkers(indexHtml) {
  let html = String(indexHtml ?? '')
  if (analyzeIndexMarkers(html).kind === 'ok') {
    return { html, added: false }
  }

  const sectionMatch = html.match(
    /(<section[^>]*\bclass\s*=\s*["'][^"']*nb-cards[^"']*["'][^>]*>)([\s\S]*?)(<\/section>)/i,
  )
  if (sectionMatch) {
    const inner = sectionMatch[2].trim()
    if (!inner.includes(MARKER_START)) {
      const wrapped = `${sectionMatch[1]}\n${MARKER_START}\n${inner}\n${MARKER_END}\n${sectionMatch[3]}`
      html = html.replace(sectionMatch[0], wrapped)
      if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: true }
    }
  }

  const gridMatch = html.match(
    /(<div[^>]*\bclass\s*=\s*["'][^"']*nb-grid[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i,
  )
  if (gridMatch && /<article[^>]*\bnb-card\b/i.test(gridMatch[2])) {
    const inner = gridMatch[2].trim()
    if (!inner.includes(MARKER_START)) {
      const wrapped = `${gridMatch[1]}\n${MARKER_START}\n${inner}\n${MARKER_END}\n${gridMatch[3]}`
      html = html.replace(gridMatch[0], wrapped)
      if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: true }
    }
  }

  const firstCardMatch = html.match(/<article[^>]*\bnb-card\b[\s\S]*?<\/article>/i)
  if (firstCardMatch && firstCardMatch.index != null) {
    const region = firstCardMatch[0]
    if (!html.includes(MARKER_START)) {
      const replacement = `${MARKER_START}\n${region.trim()}\n${MARKER_END}`
      html =
        html.slice(0, firstCardMatch.index) +
        replacement +
        html.slice(firstCardMatch.index + region.length)
      if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: true }
    }
  }

  return { html, added: false }
}

/**
 * Insert or update a post card immediately after the start marker (newest first).
 * Updates by data-slug when the slug already exists.
 * @param {{ indexHtml: string, cardHtml: string, slug: string, fileName?: string }} input
 * @returns {{ indexHtml: string, updated: boolean, reason?: string, message?: string, markersAdded?: boolean }}
 */
export function tryUpdateIndexWithCard({ indexHtml, cardHtml, slug, fileName }) {
  const { html: withMarkers, added: markersAdded } = ensureBlogPostMarkers(indexHtml)
  const analysis = analyzeIndexMarkers(withMarkers)
  if (analysis.kind !== 'ok') {
    return {
      indexHtml: withMarkers,
      updated: false,
      reason: analysis.kind,
      message: analysis.message,
      markersAdded,
    }
  }

  const { startStr, endStr, startIdx, endIdx } = analysis
  const inner = withMarkers.slice(startIdx + startStr.length, endIdx)

  const existingItems = extractListingBlocks(inner)
    .filter((block) => !blockTargetsSlug(block, slug) && !(fileName && blockTargetsFile(block, fileName)))
    .map(normalizePostBlock)

  const innerBody = [cardHtml.trim(), ...existingItems].join('\n')
  const nextHtml = replaceInnerBetweenMarkers(withMarkers, innerBody, startStr, endStr, startIdx, endIdx)
  return { indexHtml: nextHtml, updated: true, markersAdded }
}

/**
 * @deprecated Use tryUpdateIndexWithCard with templates/post-card-template.html
 */
export function tryUpdateIndexWithNewPost({
  indexHtml,
  fileName,
  title,
  excerpt,
  date,
  category,
  entryTemplate,
}) {
  const cardHtml = applyIndexEntryTemplate(entryTemplate, {
    title: title || 'Untitled',
    excerpt: excerpt ?? '',
    date: date ?? '',
    slug: fileName.replace(/\.html$/i, ''),
    fileName,
    category: category ?? '',
  })
  return tryUpdateIndexWithCard({
    indexHtml,
    cardHtml,
    slug: fileName.replace(/\.html$/i, ''),
    fileName,
  })
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
${MARKER_START}
${MARKER_END}
    </section>
  </main>
</body>
</html>
`
}
