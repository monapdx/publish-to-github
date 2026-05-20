import {
  MARKER_START,
  MARKER_END,
  analyzeIndexMarkers,
  extractListingBlocks,
  getMarkerRegionInner,
} from './blogIndex'
import { DEFAULT_INDEX_ENTRY_TEMPLATE } from './indexEntryTemplate'
import { repoPathDepth } from './indexPagePath'

const NB_CARD_RE = /\bnb-card\b/i
const NB_BTN_RE = /\bnb-btn\b/i
const POST_ITEM_RE = /\bpost-item\b/i
const POST_EXCERPT_RE = /\bpost-excerpt\b/i

/**
 * @param {string} blockHtml
 * @returns {string}
 */
export function listingBlockToEntryTemplate(blockHtml) {
  let t = String(blockHtml).trim()

  t = t.replace(
    /(<a\b[^>]*\bhref\s*=\s*["'])(?:\.\/)?[^"']*\.html(["'][^>]*>)([\s\S]*?)(<\/a>)/i,
    '$1{{url}}$2{{title}}$4',
  )

  if (!t.includes('{{title}}')) {
    t = t.replace(/<(h[1-3])\b[^>]*>[\s\S]*?<\/\1>/i, '<$1>{{title}}</$1>')
  }

  if (POST_EXCERPT_RE.test(t)) {
    t = t.replace(
      /<p\b[^>]*\bclass\s*=\s*["'][^"']*post-excerpt[^"']*["'][^>]*>[\s\S]*?<\/p>/i,
      '<p class="post-excerpt">{{excerpt}}</p>',
    )
  } else if (/<p\b/i.test(t)) {
    t = t.replace(/<p\b[^>]*>[\s\S]*?<\/p>/i, '<p>{{excerpt}}</p>')
  }

  if (NB_CARD_RE.test(t) && /<span\b[^>]*\bnb-label\b/i.test(t)) {
    t = t.replace(
      /(<span\b[^>]*\bclass\s*=\s*["'][^"']*nb-label[^"']*["'][^>]*>)[^<]*(<\/span>)/i,
      '$1{{category}}$2',
    )
  }

  if (/<time\b/i.test(t)) {
    t = t.replace(
      /<time\b[^>]*>[\s\S]*?<\/time>/i,
      '<time datetime="{{dateIso}}">{{date}}</time>',
    )
  }

  if (NB_BTN_RE.test(t) && !/{{url}}/.test(t)) {
    t = t.replace(
      /(<a\b[^>]*\bclass\s*=\s*["'][^"']*nb-btn[^"']*["'][^>]*\bhref\s*=\s*["'])(?:\.\/)?[^"']*\.html(["'])/i,
      '$1{{url}}$2',
    )
  }

  return t
}

/**
 * Infer how new posts should appear on the index from existing listing HTML/CSS.
 * @param {string} indexHtml
 * @returns {{ entryTemplate: string, source: string, listingStyle: string }}
 */
export function inferIndexEntryTemplate(indexHtml) {
  const inner = getMarkerRegionInner(indexHtml)
  if (inner != null) {
    const blocks = extractListingBlocks(inner)
    if (blocks.length > 0) {
      const tpl = listingBlockToEntryTemplate(blocks[0])
      let listingStyle = 'generic-article'
      if (NB_CARD_RE.test(blocks[0])) listingStyle = 'neo-brutalist-card'
      else if (POST_ITEM_RE.test(blocks[0])) listingStyle = 'legacy-list-item'
      return { entryTemplate: tpl, source: 'existing-listing', listingStyle }
    }
  }

  const text = String(indexHtml ?? '')
  if (NB_CARD_RE.test(text) || /\bnb-label\b/.test(text)) {
    return {
      entryTemplate: `          <article class="nb-card nb-stack-sm" data-slug="{{slug}}">
            <span class="nb-label nb-bg-pink">{{category}}</span>
            <h3>{{title}}</h3>
            <p>{{excerpt}}</p>
            <a href="{{url}}" class="nb-btn nb-btn-green">Read Post</a>
          </article>`,
      source: 'neo-brutalist-css',
      listingStyle: 'neo-brutalist-card',
    }
  }

  if (POST_ITEM_RE.test(text) || POST_EXCERPT_RE.test(text)) {
    return {
      entryTemplate: `<li class="post-item">
  <a href="{{url}}" class="post-link">{{title}}</a>
  <p class="post-excerpt">{{excerpt}}</p>
</li>`,
      source: 'legacy-post-item-css',
      listingStyle: 'legacy-list-item',
    }
  }

  return {
    entryTemplate: DEFAULT_INDEX_ENTRY_TEMPLATE,
    source: 'default',
    listingStyle: 'post-card',
  }
}

/**
 * @param {string} href
 * @param {number} indexDepth
 * @param {number} postDepth
 */
function relativizeAssetHref(href, indexDepth, postDepth) {
  const h = String(href || '').trim()
  if (!h || /^https?:\/\//i.test(h) || h.startsWith('//') || h.startsWith('#') || h.startsWith('data:')) {
    return h
  }
  const up = postDepth - indexDepth
  if (up <= 0) return h
  const prefix = '../'.repeat(up)
  return h.startsWith('/') ? h : `${prefix}${h.replace(/^\.\//, '')}`
}

/**
 * Build a full post page template using nav/footer/styles from the blog index file.
 * @param {string} indexHtml
 * @param {{ indexPagePath?: string, postsPath?: string }} [opts]
 */
export function buildPostTemplateFromIndex(indexHtml, opts = {}) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(indexHtml, 'text/html')

  const indexDepth = repoPathDepth(opts.indexPagePath || 'index.html')
  const postDepth = repoPathDepth(
    `${String(opts.postsPath || 'blog/').replace(/\\/g, '/').replace(/\/?$/, '')}/post.html`,
  )

  const headParts = []
  doc.querySelectorAll('head link[rel="stylesheet"], head link[rel="icon"], head script[src]').forEach((el) => {
    const clone = el.cloneNode(true)
    if (clone instanceof HTMLLinkElement && clone.href) {
      clone.setAttribute('href', relativizeAssetHref(clone.getAttribute('href') || '', indexDepth, postDepth))
    }
    if (clone instanceof HTMLScriptElement && clone.src) {
      clone.setAttribute('src', relativizeAssetHref(clone.getAttribute('src') || '', indexDepth, postDepth))
    }
    headParts.push(clone.outerHTML)
  })

  const navEl = doc.querySelector('nav')
  const headerEl = navEl ? null : doc.querySelector('header')
  const footerEl = doc.querySelector('footer')

  const navHtml = navEl?.outerHTML ?? ''
  const headerHtml = headerEl?.outerHTML ?? ''
  const footerHtml = footerEl?.outerHTML ?? ''

  let mainClass = 'blog-post'
  const mainOnIndex = doc.querySelector('main')
  if (mainOnIndex?.className) {
    const parts = String(mainOnIndex.className).split(/\s+/).filter(Boolean)
    const blogMain = parts.find((c) => /blog/i.test(c)) || parts[0]
    if (blogMain) mainClass = `${blogMain} blog-post`
  } else if (NB_CARD_RE.test(indexHtml)) {
    mainClass = 'blog-post nb-stack'
  }

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
    <article>
      {{content}}
    </article>
  </main>${chromeAfter}
</body>
</html>
`
}

/**
 * Run full detection on a loaded index.html string.
 * @param {string} indexHtml
 * @param {{ indexPagePath?: string, postsPath?: string }} [opts]
 */
export function detectSiteIntegration(indexHtml, opts = {}) {
  const markerAnalysis = analyzeIndexMarkers(indexHtml)
  const entry = inferIndexEntryTemplate(indexHtml)
  const postTemplate = buildPostTemplateFromIndex(indexHtml, opts)
  const hasNav = /<nav\b/i.test(indexHtml)
  const hasHeader = /<header\b/i.test(indexHtml)
  const hasFooter = /<footer\b/i.test(indexHtml)

  const messages = []
  if (markerAnalysis.kind === 'ok') {
    messages.push('Found blog post markers — new publishes can be inserted automatically.')
  } else if (markerAnalysis.kind === 'missing') {
    messages.push(
      `No ${MARKER_START} / ${MARKER_END} markers yet — add them in Edit homepage or publish will skip the index listing.`,
    )
  } else {
    messages.push(markerAnalysis.message)
  }

  if (entry.source === 'existing-listing') {
    messages.push('Copied listing card/list markup from an existing post on the index.')
  } else if (entry.source === 'neo-brutalist-css') {
    messages.push('Detected neo-brutalist card classes (nb-card, nb-btn) — applied matching listing template.')
  } else if (entry.source === 'legacy-post-item-css') {
    messages.push('Detected legacy post-item / post-excerpt classes — applied matching listing template.')
  }

  if (hasNav || hasHeader) {
    messages.push('Copied site navigation/header into the post template.')
  } else {
    messages.push('No <nav> or <header> found — post template uses main content only (you can paste nav HTML manually).')
  }

  if (hasFooter) {
    messages.push('Copied footer into the post template.')
  } else {
    messages.push('No <footer> found — add one to the post template if your site uses it.')
  }

  return {
    markerAnalysis,
    entryTemplate: entry.entryTemplate,
    entrySource: entry.source,
    listingStyle: entry.listingStyle,
    postTemplate,
    hasNav,
    hasHeader,
    hasFooter,
    messages,
  }
}
