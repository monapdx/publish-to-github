import { hasUnreplacedPlaceholders } from './templatePlaceholders'

/** Primary markers for the post listing on blog/index.html */
export const MARKER_START = '<!-- BLOG_POSTS_START -->'
export const MARKER_END = '<!-- BLOG_POSTS_END -->'
export const MARKER_BLOCK_SNIPPET = `${MARKER_START}\n${MARKER_END}`

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

const LEGACY_MARKER_START = '<!-- BLOG_EDITOR_POSTS_START -->'
const LEGACY_MARKER_END = '<!-- BLOG_EDITOR_POSTS_END -->'

export function analyzeIndexMarkers(html) {
  let text = String(html ?? '')
  text = text
    .replaceAll(LEGACY_MARKER_START, MARKER_START)
    .replaceAll(LEGACY_MARKER_END, MARKER_END)
  const nS = countSubstr(text, MARKER_START)
  const nE = countSubstr(text, MARKER_END)

  if (nS > 1 || nE > 1) {
    return { kind: 'duplicate', message: 'Keep exactly one BLOG_POSTS_START and BLOG_POSTS_END marker.' }
  }
  if (nS === 1 && nE === 1) {
    const startIdx = text.indexOf(MARKER_START)
    const endIdx = text.indexOf(MARKER_END)
    if (endIdx <= startIdx) {
      return { kind: 'order', message: 'BLOG_POSTS_START must come before BLOG_POSTS_END.' }
    }
    return { kind: 'ok', startStr: MARKER_START, endStr: MARKER_END, startIdx, endIdx }
  }
  if (nS > 0 || nE > 0) {
    return { kind: 'partial', message: 'Add both BLOG_POSTS_START and BLOG_POSTS_END markers.' }
  }
  return {
    kind: 'missing',
    message: 'Add <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> around your post cards.',
  }
}

/** Wrap nb-cards / nb-grid listing with markers when missing. */
export function ensureBlogPostMarkers(indexHtml) {
  let html = String(indexHtml ?? '')
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

export function markerRegionInner(html) {
  const a = analyzeIndexMarkers(html)
  if (a.kind !== 'ok') return null
  return html.slice(a.startIdx + a.startStr.length, a.endIdx)
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

/** Insert or replace a post card after BLOG_POSTS_START (newest first). */
export function tryUpdateIndexWithCard({ indexHtml, cardHtml, slug, postHref: href }) {
  const { html: withMarkers, added: markersAdded } = ensureBlogPostMarkers(indexHtml)
  const analysis = analyzeIndexMarkers(withMarkers)

  if (analysis.kind !== 'ok') {
    return { indexHtml: withMarkers, updated: false, markersAdded }
  }

  const { startStr, startIdx, endIdx } = analysis
  const inner = withMarkers.slice(startIdx + startStr.length, endIdx)
  const kept = extractCards(inner).filter(
    (b) =>
      !isUnrenderedPlaceholderCard(b) &&
      !cardMatchesSlug(b, slug) &&
      !(href && cardMatchesHref(b, href)),
  )
  const innerBody = [cardHtml.trim(), ...kept].join('\n')
  const before = withMarkers.slice(0, startIdx + startStr.length)
  const after = withMarkers.slice(endIdx)

  return {
    indexHtml: `${before}\n${innerBody}\n${after}`,
    updated: true,
    markersAdded,
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
