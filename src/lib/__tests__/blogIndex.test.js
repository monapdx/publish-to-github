import { describe, expect, it } from 'vitest'
import { MARKER_START, MARKER_END, analyzeIndexMarkers, tryUpdateIndexWithCard } from '../blogIndex'

describe('analyzeIndexMarkers', () => {
  it('returns missing when no markers', () => {
    expect(analyzeIndexMarkers('<body></body>').kind).toBe('missing')
  })

  it('returns ok for valid markers', () => {
    const html = `${MARKER_START}\n${MARKER_END}`
    expect(analyzeIndexMarkers(html).kind).toBe('ok')
  })
})

describe('tryUpdateIndexWithCard', () => {
  it('prepends a new card', () => {
    const inner = `<article class="nb-card" data-slug="old"><a href="posts/old.html">Old</a></article>`
    const indexHtml = `<body>${MARKER_START}\n${inner}\n${MARKER_END}</body>`
    const card = `<article data-slug="new"><a href="posts/new.html">New</a></article>`
    const r = tryUpdateIndexWithCard({
      indexHtml,
      cardHtml: card,
      slug: 'new',
      postHref: 'posts/new.html',
    })
    expect(r.updated).toBe(true)
    expect(r.indexHtml.indexOf('posts/new.html')).toBeLessThan(r.indexHtml.indexOf('posts/old.html'))
  })
})
