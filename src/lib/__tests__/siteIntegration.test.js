import { describe, expect, it } from 'vitest'
import { MARKER_START, MARKER_END } from '../blogIndex'
import { buildPostTemplateFromIndex, detectSiteIntegration } from '../siteIntegration'

describe('buildPostTemplateFromIndex', () => {
  it('includes nav and footer from blog/index.html', () => {
    const html = `<!doctype html><html><head><link rel="stylesheet" href="style.css" /></head>
<body><nav id="top">Nav</nav><main><section>${MARKER_START}${MARKER_END}</section></main><footer>Foot</footer></body></html>`
    const tpl = buildPostTemplateFromIndex(html)
    expect(tpl).toContain('<nav id="top">Nav</nav>')
    expect(tpl).toContain('<footer>Foot</footer>')
    expect(tpl).toContain('{{content}}')
  })
})

describe('detectSiteIntegration', () => {
  it('returns templates and messages', () => {
    const html = `<html><body><nav>N</nav>${MARKER_START}<article class="nb-card"><a href="posts/x.html">T</a></article>${MARKER_END}<footer>F</footer></body></html>`
    const r = detectSiteIntegration(html)
    expect(r.messages.length).toBeGreaterThan(0)
    expect(r.postTemplate).toContain('{{content}}')
    expect(r.entryTemplate).toContain('{{url}}')
  })
})
