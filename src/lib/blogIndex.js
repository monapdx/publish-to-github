import { postHref } from './blogPaths'
import { hasUnreplacedPlaceholders } from './templatePlaceholders'
import { slugify } from './slugify'

/** Primary markers for the post listing on blog/index.html */
export const MARKER_START = '<!-- BLOG_POSTS_START -->'
export const MARKER_END = '<!-- BLOG_POSTS_END -->'
export const MARKER_BLOCK_SNIPPET = `${MARKER_START}\n${MARKER_END}`

const LEGACY_MARKER_START = '<!-- BLOG_EDITOR_POSTS_START -->'
const LEGACY_MARKER_END = '<!-- BLOG_EDITOR_POSTS_END -->'

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countSubstr(str, sub) {
  if (!sub) return 0
  let c = 0
  let i = 0
  while ((i = str.indexOf(sub, i)) !== -1) {
    c += 1
    i += sub.length
  }
  return c
}

export function normalizeIndexMarkers(html) {
  return String(html ?? '')
    .replaceAll(LEGACY_MARKER_START, MARKER_START)
    .replaceAll(LEGACY_MARKER_END, MARKER_END)
}

export function analyzeIndexMarkers(html) {
  const text = normalizeIndexMarkers(html)
  const nS = countSubstr(text, MARKER_START)
  const nE = countSubstr(text, MARKER_END)

  if (nS > 1 || nE > 1) {
    return {
      kind: 'duplicate',
      message: 'Keep exactly one BLOG_POSTS_START and BLOG_POSTS_END marker.',
    }
  }
  if (nS === 1 && nE === 1) {
    const startIdx = text.indexOf(MARKER_START)
    const endIdx = text.indexOf(MARKER_END)
    if (endIdx <= startIdx) {
      return { kind: 'order', message: 'BLOG_POSTS_START must come before BLOG_POSTS_END.' }
    }
    return { kind: 'ok', startStr: MARKER_START, endStr: MARKER_END, startIdx, endIdx, text }
  }
  if (nS > 0 || nE > 0) {
    return { kind: 'partial', message: 'Add both BLOG_POSTS_START and BLOG_POSTS_END markers.' }
  }
  return {
    kind: 'missing',
    message: 'Missing <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> markers.',
  }
}

/** Wrap nb-cards / nb-grid listing with markers when missing. */
export function ensureBlogPostMarkers(indexHtml) {
  let html = normalizeIndexMarkers(indexHtml)
  if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: false }

  const sectionMatch = html.match(
    /(<section[^>]*\bclass\s*=\s*["'][^"']*nb-cards[^"']*["'][^>]*>)([\s\S]*?)(<\/section>)/i,
  )
  if (sectionMatch && !sectionMatch[2].includes(MARKER_START)) {
    html = html.replace(
      sectionMatch[0],
      `${sectionMatch[1]}\n${MARKER_START}\n${sectionMatch[2].trim()}\n${MARKER_END}\n${sectionMatch[3]}`,
    )
    if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: true }
  }

  const gridMatch = html.match(
    /(<div[^>]*\bclass\s*=\s*["'][^"']*nb-grid[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i,
  )
  if (gridMatch && /<article[^>]*\bnb-card\b/i.test(gridMatch[2]) && !gridMatch[2].includes(MARKER_START)) {
    html = html.replace(
      gridMatch[0],
      `${gridMatch[1]}\n${MARKER_START}\n${gridMatch[2].trim()}\n${MARKER_END}\n${gridMatch[3]}`,
    )
    if (analyzeIndexMarkers(html).kind === 'ok') return { html, added: true }
  }

  return { html, added: false }
}

/** Append a post-list section with markers before </body> when markers cannot be placed elsewhere. */
export function addBlogSectionIfNeeded(indexHtml) {
  const section = `
  <section class="nb-section">
    <div class="nb-container">
      <div class="nb-grid nb-stack-sm">
${MARKER_START}
${MARKER_END}
      </div>
    </div>
  </section>`
  if (/<\/body>/i.test(indexHtml)) {
    return indexHtml.replace(/<\/body>/i, `${section}\n</body>`)
  }
  return `${indexHtml}\n${section}`
}

export function markerRegionInner(html) {
  const a = analyzeIndexMarkers(html)
  if (a.kind !== 'ok') return null
  const text = a.text ?? normalizeIndexMarkers(html)
  return text.slice(a.startIdx + a.startStr.length, a.endIdx)
}

function extractCards(inner) {
  const blocks = []
  const re = /<article\b[\s\S]*?<\/article>/gi
  let m
  while ((m = re.exec(inner)) !== null) blocks.push(m[0])
  return blocks
}

function cardMatchesSlug(block, slug) {
  return new RegExp(`data-slug\\s*=\\s*["']${escapeRegExp(slug)}["']`, 'i').test(block)
}

function cardMatchesHref(block, href) {
  return new RegExp(`href\\s*=\\s*["']${escapeRegExp(href)}["']`, 'i').test(block)
}

/** Drop sample or broken cards that still contain {{TITLE}}, {{excerpt}}, etc. */
export function isUnrenderedPlaceholderCard(block) {
  return hasUnreplacedPlaceholders(block)
}

/**
 * Remove a post card from index HTML by data-slug or posts/{slug}.html href.
 * @returns {{ html: string, removed: boolean, reason: string }}
 */
export function removeCardBySlug(indexHtml, slug) {
  const normalizedSlug = slugify(String(slug ?? '').trim())
  if (!normalizedSlug) {
    return {
      html: String(indexHtml ?? ''),
      removed: false,
      reason: 'Slug is empty.',
    }
  }

  const href = postHref(normalizedSlug)
  const source = String(indexHtml ?? '')
  const articleRe = /<article\b[\s\S]*?<\/article>/gi
  let removed = false

  const html = source.replace(articleRe, (block) => {
    if (cardMatchesSlug(block, normalizedSlug) || cardMatchesHref(block, href)) {
      removed = true
      return ''
    }
    return block
  })

  if (!removed) {
    return {
      html: source,
      removed: false,
      reason: `No post card found for slug "${normalizedSlug}".`,
    }
  }

  return {
    html,
    removed: true,
    reason: `Removed post card for slug "${normalizedSlug}".`,
  }
}

/**
 * Insert or replace a post card immediately after BLOG_POSTS_START (newest first).
 * @returns {{ indexHtml: string, updated: boolean, reason?: string, markersAdded?: boolean, sectionAdded?: boolean }}
 */
export function tryUpdateIndexWithCard({ indexHtml, cardHtml, slug, postHref: href }) {
  const trimmedCard = String(cardHtml ?? '').trim()
  if (!trimmedCard) {
    return {
      indexHtml: String(indexHtml ?? ''),
      updated: false,
      reason: 'Post card HTML was empty.',
      markersAdded: false,
      sectionAdded: false,
    }
  }

  let html = normalizeIndexMarkers(indexHtml)
  let markersAdded = false
  let sectionAdded = false

  const wrapped = ensureBlogPostMarkers(html)
  html = wrapped.html
  markersAdded = wrapped.added

  let analysis = analyzeIndexMarkers(html)
  if (analysis.kind !== 'ok') {
    html = addBlogSectionIfNeeded(html)
    sectionAdded = true
    const wrapped2 = ensureBlogPostMarkers(html)
    html = wrapped2.html
    markersAdded = markersAdded || wrapped2.added
    analysis = analyzeIndexMarkers(html)
  }

  if (analysis.kind !== 'ok') {
    return {
      indexHtml: html,
      updated: false,
      reason: analysis.message,
      markersAdded,
      sectionAdded,
    }
  }

  const { startStr, startIdx, endIdx } = analysis
  const markerText = analysis.text ?? html
  const inner = markerText.slice(startIdx + startStr.length, endIdx)
  const kept = extractCards(inner).filter(
    (b) =>
      !isUnrenderedPlaceholderCard(b) &&
      !cardMatchesSlug(b, slug) &&
      !(href && cardMatchesHref(b, href)),
  )
  const innerBody = [trimmedCard, ...kept].join('\n')
  const before = markerText.slice(0, startIdx + startStr.length)
  const after = markerText.slice(endIdx)
  const nextHtml = `${before}\n${innerBody}\n${after}`

  const hadCard = cardMatchesSlug(inner, slug) || (href && inner.includes(href))
  const inserted = innerBody.startsWith(trimmedCard)
  if (!inserted && !hadCard) {
    return {
      indexHtml: nextHtml,
      updated: false,
      reason: 'Card could not be inserted after BLOG_POSTS_START.',
      markersAdded,
      sectionAdded,
    }
  }

  return {
    indexHtml: nextHtml,
    updated: true,
    reason: hadCard ? 'Updated existing post card on index.' : 'Inserted new post card on index.',
    markersAdded,
    sectionAdded,
  }
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
  <main>
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
