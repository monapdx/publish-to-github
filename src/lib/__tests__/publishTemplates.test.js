import { describe, expect, it } from 'vitest'
import { buildPublishTemplateData, renderPostCardHtml } from '../publishTemplates'
import { replaceTemplateVars as replaceVars } from '../templateVars'
import { tryUpdateIndexWithCard, MARKER_START, MARKER_END } from '../blogIndex'

const SAMPLE = {
  title:
    'Top Five Things I Look for in GitHub Repositories as a Non-Coder',
  category: 'Github',
  categoryClass: 'nb-bg-pink',
  excerpt:
    "You don't have to browse Github for too long before you realize that not all repos are created equally.",
  slug: 'top-five-things-i-look-for-in-github-repositories-as-a-non-coder',
}

describe('replaceTemplateVars', () => {
  it('escapes title but not content', () => {
    const out = replaceVars('{{TITLE}} {{CONTENT}}', {
      TITLE: 'A & B',
      CONTENT: '<p>ok</p>',
    })
    expect(out).toContain('A &amp; B')
    expect(out).toContain('<p>ok</p>')
  })
})

describe('sample post card', () => {
  it('matches expected neo-brutalist card markup', () => {
    const data = buildPublishTemplateData({
      title: SAMPLE.title,
      slug: SAMPLE.slug,
      excerpt: SAMPLE.excerpt,
      category: SAMPLE.category,
      categoryClass: SAMPLE.categoryClass,
      content: '<p>Body</p>',
      postRepoPath: `${SAMPLE.slug}.html`,
      indexRepoPath: 'index.html',
    })
    expect(data.URL).toBe(`${SAMPLE.slug}.html`)

    const card = renderPostCardHtml(data).replace(/\s+/g, ' ').trim()
    const expected = `<article class="nb-card nb-stack-sm" data-slug="${SAMPLE.slug}"> <span class="nb-label nb-bg-pink">Github</span> <h3><a href="${SAMPLE.slug}.html">${SAMPLE.title}</a></h3> <p>${SAMPLE.excerpt}</p> <a href="${SAMPLE.slug}.html" class="nb-btn nb-btn-green">Read Post</a> </article>`

    expect(card).toBe(expected)
  })

  it('updates existing card by data-slug instead of duplicating', () => {
    const existingSlug = SAMPLE.slug
    const oldCard = `<article class="nb-card nb-stack-sm" data-slug="${existingSlug}"><h3>Old</h3></article>`
    const indexHtml = `<section>${MARKER_START}\n${oldCard}\n${MARKER_END}</section>`
    const data = buildPublishTemplateData({
      title: SAMPLE.title,
      slug: SAMPLE.slug,
      excerpt: SAMPLE.excerpt,
      category: SAMPLE.category,
      categoryClass: SAMPLE.categoryClass,
      content: '<p>x</p>',
      postRepoPath: `${SAMPLE.slug}.html`,
      indexRepoPath: 'index.html',
    })
    const newCard = renderPostCardHtml(data)
    const r = tryUpdateIndexWithCard({ indexHtml, cardHtml: newCard, slug: SAMPLE.slug })
    expect(r.updated).toBe(true)
    const matches = r.indexHtml.match(new RegExp(`data-slug="${existingSlug}"`, 'g'))
    expect(matches?.length).toBe(1)
    expect(r.indexHtml).toContain(SAMPLE.title)
  })
})
