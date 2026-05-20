import { describe, expect, it } from 'vitest'
import {
  POST_PAGE_TEMPLATE_MARKER,
  buildPublishTemplateData,
  getPostPageTemplate,
  renderPostCardHtml,
  renderPostPageHtml,
} from '../publishTemplates'
import { READ_ONLY_TEMPLATES } from '../readOnlyTemplates'
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

describe('getPostPageTemplate', () => {
  it('loads templates/post-page-template.html via READ_ONLY_TEMPLATES', () => {
    expect(getPostPageTemplate()).toBe(READ_ONLY_TEMPLATES.postPageTemplateHtml)
    expect(getPostPageTemplate()).toContain(POST_PAGE_TEMPLATE_MARKER)
    expect(getPostPageTemplate()).toContain('<!DOCTYPE html>')
  })
})

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
    })
    expect(data).toMatchObject({
      SLUG: SAMPLE.slug,
      URL: `posts/${SAMPLE.slug}.html`,
      TITLE: SAMPLE.title,
      EXCERPT: SAMPLE.excerpt,
      CATEGORY: SAMPLE.category,
      CATEGORY_CLASS: SAMPLE.categoryClass,
      CONTENT: '<p>Body</p>',
      STYLESHEET: '../style.css',
    })
    expect(data.DATE).toBeTruthy()

    const card = renderPostCardHtml(data).replace(/\s+/g, ' ').trim()
    expect(card).not.toMatch(/\{\{[^}]+\}\}/)
    const expected = `<article class="nb-card nb-stack-sm" data-slug="${SAMPLE.slug}"> <span class="nb-label nb-bg-pink">Github</span> <h3><a href="posts/${SAMPLE.slug}.html">${SAMPLE.title}</a></h3> <p>${SAMPLE.excerpt}</p> <a href="posts/${SAMPLE.slug}.html" class="nb-btn nb-btn-green">Read Post</a> </article>`

    expect(card).toBe(expected)
  })

  it('renders a full post page with index shell, stylesheet, and home links', () => {
    const data = buildPublishTemplateData({
      title: SAMPLE.title,
      slug: SAMPLE.slug,
      excerpt: SAMPLE.excerpt,
      category: SAMPLE.category,
      categoryClass: SAMPLE.categoryClass,
      content: '<p>Body</p>',
    })
    const page = renderPostPageHtml(data)
    expect(page).toContain(POST_PAGE_TEMPLATE_MARKER)
    expect(page).toContain('<nav class="nb-nav">')
    expect(page).toContain('<footer class="nb-section">')
    expect(page).toContain('href="../style.css"')
    expect(page).toContain('href="../index.html"')
    expect(page).toContain('class="nb-card nb-stack-md blog-post"')
    expect(page).toContain('<p>Body</p>')
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
    })
    const newCard = renderPostCardHtml(data)
    const r = tryUpdateIndexWithCard({
      indexHtml,
      cardHtml: newCard,
      slug: SAMPLE.slug,
      postHref: `posts/${SAMPLE.slug}.html`,
    })
    expect(r.updated).toBe(true)
    const matches = r.indexHtml.match(new RegExp(`data-slug="${existingSlug}"`, 'g'))
    expect(matches?.length).toBe(1)
    expect(r.indexHtml).toContain(SAMPLE.title)
  })
})
