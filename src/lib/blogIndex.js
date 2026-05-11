import { applyIndexEntryTemplate } from './indexEntryTemplate'

/** Markers users add to homepage HTML so new posts can be inserted between them. */
export const MARKER_START = '<!-- BLOG-POSTS-START -->'
export const MARKER_END = '<!-- BLOG-POSTS-END -->'

/** @deprecated Still recognized so older sites keep working */
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

function extractItems(inner) {
  const blocks = []
  const re = /<(article|li)\b[\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(inner)) !== null) {
    blocks.push(m[0])
  }
  return blocks
}

function blockTargetsFile(blockHtml, fileName) {
  const safe = escapeRegExp(fileName)
  const re = new RegExp(`href\\s*=\\s*["'](?:\\.\\/)?${safe}["']`, 'i')
  return re.test(blockHtml)
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
export function analyzeIndexMarkers(html) {
  const text = String(html ?? '')
  const nS = countSubstr(text, MARKER_START)
  const nE = countSubstr(text, MARKER_END)
  const lS = countSubstr(text, LEGACY_START)
  const lE = countSubstr(text, LEGACY_END)

  if (nS > 1 || nE > 1) {
    return {
      kind: 'duplicate',
      message:
        'More than one copy of the new markers was found. Keep exactly one <!-- BLOG-POSTS-START --> and one <!-- BLOG-POSTS-END --> in this file.',
    }
  }
  if (nS === 1 && nE === 1) {
    const startIdx = text.indexOf(MARKER_START)
    const endIdx = text.indexOf(MARKER_END)
    if (endIdx <= startIdx) {
      return {
        kind: 'order',
        message: 'The start marker must appear earlier in the file than the end marker.',
      }
    }
    return { kind: 'ok', startStr: MARKER_START, endStr: MARKER_END, startIdx, endIdx }
  }
  if (nS > 0 || nE > 0) {
    return {
      kind: 'partial',
      message:
        'Only one of the new marker comments was found. Add both <!-- BLOG-POSTS-START --> and <!-- BLOG-POSTS-END --> in pairs.',
    }
  }

  if (lS > 1 || lE > 1) {
    return {
      kind: 'duplicate',
      message:
        'More than one copy of the legacy markers was found. Remove duplicates so automatic updates know where to insert posts.',
    }
  }
  if (lS === 1 && lE === 1) {
    const startIdx = text.indexOf(LEGACY_START)
    const endIdx = text.indexOf(LEGACY_END)
    if (endIdx <= startIdx) {
      return { kind: 'order', message: 'The legacy start marker must come before the end marker.' }
    }
    return { kind: 'ok', startStr: LEGACY_START, endStr: LEGACY_END, startIdx, endIdx }
  }
  if (lS > 0 || lE > 0) {
    return {
      kind: 'partial',
      message: 'A legacy marker pair is incomplete. Fix or switch to the new BLOG-POSTS markers.',
    }
  }

  return {
    kind: 'missing',
    message:
      'No marker comments were found. Paste <!-- BLOG-POSTS-START --> and <!-- BLOG-POSTS-END --> where new posts should appear.',
  }
}

/**
 * Insert or refresh a post entry between markers. Only runs when markers are valid (single pair).
 * @param {{ indexHtml: string, fileName: string, title: string, excerpt?: string, date?: string, category?: string, entryTemplate: string }} input
 * @returns {{ indexHtml: string, updated: boolean, reason?: string, message?: string }}
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
  const analysis = analyzeIndexMarkers(indexHtml)
  if (analysis.kind !== 'ok') {
    return {
      indexHtml,
      updated: false,
      reason: analysis.kind,
      message: analysis.message,
    }
  }

  const { startStr, endStr, startIdx, endIdx } = analysis
  const inner = indexHtml.slice(startIdx + startStr.length, endIdx)

  const existingItems = extractItems(inner)
    .filter((block) => !blockTargetsFile(block, fileName))
    .map(normalizePostBlock)

  const newItem = applyIndexEntryTemplate(entryTemplate, {
    title: title || 'Untitled',
    excerpt: excerpt ?? '',
    date: date ?? '',
    slug: fileName.replace(/\.html$/i, ''),
    fileName,
    category: category ?? '',
  })

  const innerBody = [newItem, ...existingItems].join('\n')
  const nextHtml = replaceInnerBetweenMarkers(indexHtml, innerBody, startStr, endStr, startIdx, endIdx)
  return { indexHtml: nextHtml, updated: true }
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
