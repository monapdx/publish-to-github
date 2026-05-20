import { describe, expect, it } from 'vitest'
import { MARKER_START, MARKER_END } from '../blogIndex'
import {
  buildPostTemplateFromIndex,
  detectSiteIntegration,
  inferIndexEntryTemplate,
  listingBlockToEntryTemplate,
} from '../siteIntegration'

describe('listingBlockToEntryTemplate', () => {
  it('replaces href and title in a card block', () => {
    const block = `<article class="nb-card"><h3><a href="old.html">Old Title</a></h3><p>Hi</p></article>`
    const tpl = listingBlockToEntryTemplate(block)
    expect(tpl).toContain('href="{{url}}"')
    expect(tpl).toContain('{{title}}')
  })
})

describe('inferIndexEntryTemplate', () => {
  it('uses first listing between markers', () => {
    const inner = `<article class="nb-card"><h3><a href="a.html">A</a></h3><p>x</p></article>`
    const html = `<body>${MARKER_START}${inner}${MARKER_END}</body>`
    const r = inferIndexEntryTemplate(html)
    expect(r.source).toBe('existing-listing')
    expect(r.entryTemplate).toContain('{{url}}')
  })
})

describe('buildPostTemplateFromIndex', () => {
  it('includes nav and footer from index', () => {
    const html = `<!doctype html><html><head><link rel="stylesheet" href="styles.css" /></head>
<body><nav id="top">Nav</nav><main><section>${MARKER_START}${MARKER_END}</section></main><footer>Foot</footer></body></html>`
    const tpl = buildPostTemplateFromIndex(html, { indexPagePath: 'blog/index.html', postsPath: 'blog/' })
    expect(tpl).toContain('<nav id="top">Nav</nav>')
    expect(tpl).toContain('<footer>Foot</footer>')
    expect(tpl).toContain('{{content}}')
    expect(tpl).toContain('styles.css')
  })
})

describe('detectSiteIntegration', () => {
  it('returns messages and templates', () => {
    const html = `<html><body><nav>N</nav>${MARKER_START}<article class="nb-card"><a href="x.html">T</a></article>${MARKER_END}<footer>F</footer></body></html>`
    const r = detectSiteIntegration(html, { indexPagePath: 'index.html', postsPath: 'blog/' })
    expect(r.messages.length).toBeGreaterThan(0)
    expect(r.postTemplate).toContain('{{content}}')
    expect(r.entryTemplate).toContain('{{url}}')
  })
})
