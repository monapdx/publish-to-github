import { describe, expect, it } from 'vitest'
import { buildMarkdownDocument, htmlToMarkdown, markdownFilename } from '../markdownExport.js'

describe('markdownExport', () => {
  it('converts basic HTML to markdown', () => {
    const md = htmlToMarkdown('<p>Hello <strong>world</strong></p>')
    expect(md).toContain('Hello')
    expect(md).toContain('**world**')
  })

  it('builds frontmatter with draft status', () => {
    const doc = buildMarkdownDocument({
      title: 'My Post',
      slug: 'my-post',
      excerpt: 'A short blurb',
      category: 'Notes',
      content: '<p>Body text</p>',
      status: 'draft',
      updatedAt: '2026-01-15T12:00:00.000Z',
    })
    expect(doc).toContain('title: My Post')
    expect(doc).toContain('status: draft')
    expect(doc).toContain('# My Post')
    expect(doc).toContain('Body text')
  })

  it('names draft and final files differently', () => {
    expect(markdownFilename({ slug: 'hello-world', status: 'draft' })).toBe('hello-world-draft.md')
    expect(markdownFilename({ slug: 'hello-world', status: 'final' })).toBe('hello-world.md')
  })
})
