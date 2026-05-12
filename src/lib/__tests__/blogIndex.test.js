import { describe, expect, it } from 'vitest'
import {
  MARKER_START,
  MARKER_END,
  analyzeIndexMarkers,
  tryUpdateIndexWithNewPost,
} from '../blogIndex'
import { DEFAULT_INDEX_ENTRY_TEMPLATE } from '../indexEntryTemplate'

describe('analyzeIndexMarkers', () => {
  it('returns missing when no markers', () => {
    const r = analyzeIndexMarkers('<html><body><p>hi</p></body></html>')
    expect(r.kind).toBe('missing')
  })

  it('returns ok for a single new marker pair in order', () => {
    const html = `<div>
${MARKER_START}
${MARKER_END}
</div>`
    const r = analyzeIndexMarkers(html)
    expect(r.kind).toBe('ok')
    if (r.kind === 'ok') {
      expect(r.startStr).toBe(MARKER_START)
      expect(r.endStr).toBe(MARKER_END)
      expect(r.endIdx).toBeGreaterThan(r.startIdx)
    }
  })

  it('flags duplicate start markers', () => {
    const html = `${MARKER_START}\n<p>x</p>\n${MARKER_START}\n${MARKER_END}`
    const r = analyzeIndexMarkers(html)
    expect(r.kind).toBe('duplicate')
  })
})

describe('tryUpdateIndexWithNewPost', () => {
  it('prepends a new entry and keeps existing cards', () => {
    const inner = `<article class="old"><h2><a href="old.html">Old</a></h2></article>`
    const indexHtml = `<!doctype html><body>${MARKER_START}\n${inner}\n${MARKER_END}</body></html>`
    const r = tryUpdateIndexWithNewPost({
      indexHtml,
      fileName: 'new-post.html',
      title: 'New',
      excerpt: 'Ex',
      date: '2026-01-01T12:00:00.000Z',
      category: 'Cat',
      entryTemplate: DEFAULT_INDEX_ENTRY_TEMPLATE,
    })
    expect(r.updated).toBe(true)
    expect(r.indexHtml).toContain('new-post.html')
    expect(r.indexHtml).toContain('old.html')
    expect(r.indexHtml.indexOf('new-post.html')).toBeLessThan(r.indexHtml.indexOf('old.html'))
  })

  it('returns updated false when markers are missing', () => {
    const r = tryUpdateIndexWithNewPost({
      indexHtml: '<html></html>',
      fileName: 'x.html',
      title: 'T',
      entryTemplate: DEFAULT_INDEX_ENTRY_TEMPLATE,
    })
    expect(r.updated).toBe(false)
  })
})
