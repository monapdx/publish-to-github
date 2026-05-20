import { describe, expect, it } from 'vitest'
import { MARKER_END, MARKER_START } from '../blogIndex'
import {
  BLOG_STYLESHEET_FILE,
  blogIndexPath,
  blogStylePath,
  buildPagesDeployWorkflow,
  buildStarterIndexHtml,
  normalizeBlogDir,
  prepareExistingIndexHtml,
} from '../repoSiteBootstrap'

describe('normalizeBlogDir', () => {
  it('defaults to blog', () => {
    expect(normalizeBlogDir('')).toBe('blog')
    expect(normalizeBlogDir('blog/')).toBe('blog')
  })
})

describe('blog paths', () => {
  it('uses blog/index.html and blog/style.css', () => {
    expect(blogIndexPath('blog/')).toBe('blog/index.html')
    expect(blogStylePath('blog/')).toBe(`blog/${BLOG_STYLESHEET_FILE}`)
  })
})

describe('buildStarterIndexHtml', () => {
  it('includes BLOG_POSTS markers and style.css', () => {
    const html = buildStarterIndexHtml({ blogTitle: 'My Blog', stylesheetHref: 'style.css' })
    expect(html).toContain(MARKER_START)
    expect(html).toContain(MARKER_END)
    expect(html).toContain('My Blog')
    expect(html).toContain('href="style.css"')
  })
})

describe('buildPagesDeployWorkflow', () => {
  it('uploads the blog folder as the Pages artifact', () => {
    const yml = buildPagesDeployWorkflow('blog')
    expect(yml).toContain('path: blog')
    expect(yml).toContain('deploy-pages')
  })
})

describe('prepareExistingIndexHtml', () => {
  it('does not remove body content outside cards', () => {
    const html = `<!DOCTYPE html><html><body><nav>Nav</nav><p>Keep</p></body></html>`
    const r = prepareExistingIndexHtml(html)
    expect(r.html).toContain('Nav')
    expect(r.html).toContain('Keep')
  })
})
