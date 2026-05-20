import { describe, expect, it } from 'vitest'
import { isUnrenderedPlaceholderCard, tryUpdateIndexWithCard, MARKER_START, MARKER_END } from '../blogIndex'
import {
  PublishValidationError,
  buildPublishTemplateData,
  renderPostCardHtml,
} from '../publishTemplates'

describe('renderPostCardHtml', () => {
  it('renders uppercase placeholders with real post data', () => {
    const data = buildPublishTemplateData({
      title: 'Hello World',
      slug: 'hello-world',
      excerpt: 'Short excerpt',
      category: 'News',
      categoryClass: 'nb-bg-pink',
      content: '<p>Body</p>',
    })
    const card = renderPostCardHtml(data)
    expect(card).toContain('Hello World')
    expect(card).toContain('Short excerpt')
    expect(card).toContain('posts/hello-world.html')
    expect(card).not.toMatch(/\{\{[^}]+\}\}/)
  })

  it('throws when required placeholders are missing from template data', () => {
    expect(() => renderPostCardHtml({ TITLE: 'Only title set' })).toThrow(PublishValidationError)
  })
})

describe('tryUpdateIndexWithCard', () => {
  it('removes unrendered sample cards and inserts rendered card', () => {
    const bad = `<article class="nb-card" data-slug="sample"><span>{{CATEGORY}}</span><h3>{{TITLE}}</h3><p>{{excerpt}}</p></article>`
    const indexHtml = `<div>${MARKER_START}\n${bad}\n${MARKER_END}</div>`
    const data = buildPublishTemplateData({
      title: 'Real Post',
      slug: 'real-post',
      excerpt: 'Real excerpt',
      category: 'GitHub',
      content: '<p>x</p>',
    })
    const cardHtml = renderPostCardHtml(data)
    const r = tryUpdateIndexWithCard({
      indexHtml,
      cardHtml,
      slug: 'real-post',
      postHref: 'posts/real-post.html',
    })
    expect(r.updated).toBe(true)
    expect(r.indexHtml).toContain('Real Post')
    expect(r.indexHtml).not.toContain('{{TITLE}}')
    expect(r.indexHtml).not.toContain('{{excerpt}}')
    expect(isUnrenderedPlaceholderCard(bad)).toBe(true)
  })
})
