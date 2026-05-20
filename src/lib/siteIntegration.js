import { MARKER_END, MARKER_START, analyzeIndexMarkers, markerRegionInner } from './blogIndex'
import { BLOG_INDEX, BLOG_POSTS } from './blogPaths'
import { DEFAULT_INDEX_ENTRY_TEMPLATE } from './indexEntryTemplate'

const NB_CARD_RE = /\bnb-card\b/i

function repoPathDepth(repoPath) {
  return String(repoPath).split('/').filter(Boolean).length
}

function listingBlockToEntryTemplate(blockHtml) {
  let t = String(blockHtml).trim()
  t = t.replace(
    /(<a\b[^>]*\bhref\s*=\s*["'])(?:\.\/)?[^"']*\.html(["'][^>]*>)([\s\S]*?)(<\/a>)/i,
    '$1{{url}}$2{{title}}$4',
  )
  if (!t.includes('{{title}}')) {
    t = t.replace(/<(h[1-3])\b[^>]*>[\s\S]*?<\/\1>/i, '<$1>{{title}}</$1>')
  }
  if (/<p\b/i.test(t)) t = t.replace(/<p\b[^>]*>[\s\S]*?<\/p>/i, '<p>{{excerpt}}</p>')
  if (/<span\b[^>]*\bnb-label\b/i.test(t)) {
    t = t.replace(/(<span\b[^>]*\bnb-label[^>]*>)[^<]*(<\/span>)/i, '$1{{category}}$2')
  }
  return t
}

function inferEntryTemplate(indexHtml) {
  const inner = markerRegionInner(indexHtml)
  const card = inner?.match(/<article\b[\s\S]*?<\/article>/i)?.[0]
  if (card) return listingBlockToEntryTemplate(card)
  return DEFAULT_INDEX_ENTRY_TEMPLATE
}

function relativizeAssetHref(href, indexDepth, postDepth) {
  const h = String(href || '').trim()
  if (!h || /^https?:\/\//i.test(h) || h.startsWith('//') || h.startsWith('#') || h.startsWith('data:')) {
    return h
  }
  const up = postDepth - indexDepth
  if (up <= 0) return h
  return h.startsWith('/') ? h : `${'../'.repeat(up)}${h.replace(/^\.\//, '')}`
}

export function buildPostTemplateFromIndex(indexHtml) {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html')
  const indexDepth = repoPathDepth(BLOG_INDEX)
  const postDepth = repoPathDepth(`${BLOG_POSTS}/post.html`)

  const headParts = []
  doc.querySelectorAll('head link[rel="stylesheet"], head link[rel="icon"]').forEach((el) => {
    const clone = el.cloneNode(true)
    if (clone instanceof HTMLLinkElement) {
      clone.setAttribute(
        'href',
        relativizeAssetHref(clone.getAttribute('href') || '', indexDepth, postDepth),
      )
    }
    headParts.push(clone.outerHTML)
  })

  const navHtml = doc.querySelector('nav')?.outerHTML ?? ''
  const headerHtml = navHtml ? '' : (doc.querySelector('header')?.outerHTML ?? '')
  const footerHtml = doc.querySelector('footer')?.outerHTML ?? ''
  const mainEl = doc.querySelector('main')
  const mainBase = mainEl?.className?.split(/\s+/).filter(Boolean)[0]
  const mainClass = mainBase
    ? `${mainBase} blog-post`
    : NB_CARD_RE.test(indexHtml)
      ? 'blog-post nb-stack'
      : 'blog-post'

  const headExtra = headParts.length ? `\n  ${headParts.join('\n  ')}` : ''
  const chromeBefore = [navHtml, headerHtml].filter(Boolean).join('\n')
  const chromeAfter = footerHtml ? `\n${footerHtml}` : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <meta name="description" content="{{excerpt}}" />
  <meta name="blog-editor:title" content="{{title}}" />
  <meta name="blog-editor:excerpt" content="{{excerpt}}" />
  <meta name="blog-editor:category" content="{{category}}" />${headExtra}
</head>
<body>
${chromeBefore}
  <main class="${mainClass}">
    <h1>{{title}}</h1>
    <article>{{content}}</article>
  </main>${chromeAfter}
</body>
</html>
`
}

export function detectSiteIntegration(indexHtml) {
  const markerAnalysis = analyzeIndexMarkers(indexHtml)
  const entryTemplate = inferEntryTemplate(indexHtml)
  const postTemplate = buildPostTemplateFromIndex(indexHtml)
  const messages = []

  if (markerAnalysis.kind === 'ok') {
    messages.push('Found BLOG_POSTS markers — publishes will update the homepage listing.')
  } else {
    messages.push(markerAnalysis.message)
  }
  if (/<nav\b|<header\b/i.test(indexHtml)) messages.push('Copied navigation into the post template.')
  if (/<footer\b/i.test(indexHtml)) messages.push('Copied footer into the post template.')

  return { markerAnalysis, entryTemplate, postTemplate, messages }
}
