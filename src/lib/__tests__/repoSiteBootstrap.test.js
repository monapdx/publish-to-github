import { describe, expect, it } from 'vitest'
import { MARKER_END, MARKER_START } from '../blogIndex'
import {
  BLOG_STYLESHEET_FILE,
  blogIndexPath,
  blogStylePath,
  buildPagesDeployWorkflow,
  buildStarterIndexHtml,
  formatWorkflowBranch,
  prepareDesignIndexHtml,
  prepareExistingIndexHtml,
} from '../repoSiteBootstrap'
import { READ_ONLY_TEMPLATES } from '../readOnlyTemplates'

describe('blog paths', () => {
  it('uses blog/index.html and blog/style.css for blog/posts/', () => {
    expect(blogIndexPath('blog/posts/')).toBe('blog/index.html')
    expect(blogStylePath('blog/posts/')).toBe(`blog/${BLOG_STYLESHEET_FILE}`)
  })
})

describe('prepareDesignIndexHtml', () => {
  it('clears sample cards between markers and points stylesheet at style.css', () => {
    const html = prepareDesignIndexHtml(READ_ONLY_TEMPLATES.indexDesignHtml, 'style.css')
    expect(html).toContain(MARKER_START)
    expect(html).toContain(MARKER_END)
    expect(html).toContain('href="style.css"')
    const between = html.split(MARKER_START)[1]?.split(MARKER_END)[0] ?? ''
    expect(between.trim()).toBe('')
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

describe('formatWorkflowBranch', () => {
  it('quotes branch names with spaces', () => {
    expect(formatWorkflowBranch('my branch')).toBe('"my branch"')
    expect(formatWorkflowBranch('main')).toBe('main')
  })
})

describe('buildPagesDeployWorkflow', () => {
  it('uploads blog/ as the Pages artifact and uses configure-pages', () => {
    const yml = buildPagesDeployWorkflow('blog', 'main')
    expect(yml).toContain('path: blog')
    expect(yml).toContain('configure-pages@v5')
    expect(yml).toContain('deploy-pages')
    expect(yml).toContain('branches: [main]')
    expect(yml).toContain('name: Deploy blog to GitHub Pages')
  })

  it('uses the configured branch in on.push', () => {
    const yml = buildPagesDeployWorkflow('blog', 'develop')
    expect(yml).toContain('branches: [develop]')
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
