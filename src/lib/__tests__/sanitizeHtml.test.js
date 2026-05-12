import { describe, expect, it } from 'vitest'
import { sanitizePublishedBodyHtml } from '../sanitizeHtml'

describe('sanitizePublishedBodyHtml', () => {
  it('removes script tags', () => {
    const out = sanitizePublishedBodyHtml('<p>Hi</p><script>alert(1)</script>')
    expect(out).not.toMatch(/<script/i)
    expect(out).toMatch(/Hi/)
  })

  it('returns empty paragraph for blank input', () => {
    expect(sanitizePublishedBodyHtml('   ')).toBe('<p></p>')
  })

  it('allows common prose tags', () => {
    const html = '<p><strong>B</strong></p><ul><li>a</li></ul>'
    expect(sanitizePublishedBodyHtml(html)).toContain('<strong>')
  })
})
