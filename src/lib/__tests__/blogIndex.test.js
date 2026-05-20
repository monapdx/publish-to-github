import { describe, expect, it } from 'vitest'
import {
  MARKER_START,
  MARKER_END,
  analyzeIndexMarkers,
  addBlogSectionIfNeeded,
  tryUpdateIndexWithCard,
} from '../blogIndex'

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
    expect(r.reason).toMatch(/Inserted|Updated/)
  })

  it('replaces an existing card with the same slug', () => {
    const oldCard = `<article data-slug="same"><a href="posts/same.html">Old title</a></article>`
    const indexHtml = `${MARKER_START}\n${oldCard}\n${MARKER_END}`
    const newCard = `<article data-slug="same"><a href="posts/same.html">New title</a></article>`
    const r = tryUpdateIndexWithCard({
      indexHtml,
      cardHtml: newCard,
      slug: 'same',
      postHref: 'posts/same.html',
    })
    expect(r.updated).toBe(true)
    expect(r.indexHtml).toContain('New title')
    expect(r.indexHtml).not.toContain('Old title')
    expect(r.reason).toMatch(/Updated existing/)
  })

  it('adds markers via new section when index has none', () => {
    const indexHtml = '<!doctype html><html><body><main></main></body></html>'
    const card = `<article data-slug="x"><a href="posts/x.html">X</a></article>`
    const r = tryUpdateIndexWithCard({ indexHtml, cardHtml: card, slug: 'x', postHref: 'posts/x.html' })
    expect(r.updated).toBe(true)
    expect(r.sectionAdded).toBe(true)
    expect(r.indexHtml).toContain(MARKER_START)
    expect(r.indexHtml).toContain('posts/x.html')
  })

  it('returns reason when card HTML is empty', () => {
    const r = tryUpdateIndexWithCard({
      indexHtml: `${MARKER_START}\n${MARKER_END}`,
      cardHtml: '   ',
      slug: 'x',
      postHref: 'posts/x.html',
    })
    expect(r.updated).toBe(false)
    expect(r.reason).toMatch(/empty/i)
  })
})

describe('addBlogSectionIfNeeded', () => {
  it('inserts section before closing body', () => {
    const next = addBlogSectionIfNeeded('<html><body></body></html>')
    expect(next).toContain(MARKER_START)
    expect(next.indexOf(MARKER_START)).toBeLessThan(next.indexOf('</body>'))
  })
})
