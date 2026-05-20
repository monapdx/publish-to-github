import { describe, expect, it } from 'vitest'
import { MARKER_START, MARKER_END, analyzeIndexMarkers, tryUpdateIndexWithCard } from '../blogIndex'

describe('analyzeIndexMarkers', () => {
  it('returns missing when no markers', () => {
    const r = analyzeIndexMarkers('<html><body><p>hi</p></body></html>')
    expect(r.kind).toBe('missing')
  })

  it('returns ok for BLOG_POSTS underscore markers', () => {
    const html = `<div>
${MARKER_START}
${MARKER_END}
</div>`
    const r = analyzeIndexMarkers(html)
    expect(r.kind).toBe('ok')
    if (r.kind === 'ok') {
      expect(r.startStr).toBe('<!-- BLOG_POSTS_START -->')
      expect(r.endStr).toBe('<!-- BLOG_POSTS_END -->')
      expect(r.endIdx).toBeGreaterThan(r.startIdx)
    }
  })

  it('flags duplicate start markers', () => {
    const html = `${MARKER_START}\n<p>x</p>\n${MARKER_START}\n${MARKER_END}`
    const r = analyzeIndexMarkers(html)
    expect(r.kind).toBe('duplicate')
  })
})

describe('tryUpdateIndexWithCard', () => {
  it('prepends a new card and keeps existing cards', () => {
    const inner = `<article class="nb-card" data-slug="old"><h3><a href="old.html">Old</a></h3></article>`
    const indexHtml = `<!doctype html><body>${MARKER_START}\n${inner}\n${MARKER_END}</body></html>`
    const card = `<article class="nb-card nb-stack-sm" data-slug="new-post"><h3><a href="new-post.html">New</a></h3></article>`
    const r = tryUpdateIndexWithCard({ indexHtml, cardHtml: card, slug: 'new-post' })
    expect(r.updated).toBe(true)
    expect(r.indexHtml).toContain('new-post.html')
    expect(r.indexHtml).toContain('old.html')
    expect(r.indexHtml.indexOf('new-post')).toBeLessThan(r.indexHtml.indexOf('data-slug="old"'))
  })

  it('returns updated false when markers cannot be added', () => {
    const r = tryUpdateIndexWithCard({
      indexHtml: '<html><body><p>no cards</p></body></html>',
      cardHtml: '<article data-slug="x"></article>',
      slug: 'x',
    })
    expect(r.updated).toBe(false)
  })
})
