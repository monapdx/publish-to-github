import { describe, expect, it } from 'vitest'
import { READ_ONLY_TEMPLATES } from '../readOnlyTemplates'

describe('pages workflow template', () => {
  it('deploys the blog folder', () => {
    const yml = READ_ONLY_TEMPLATES.githubPagesWorkflowYaml.replace(/\{\{BLOG_DIR\}\}/g, 'blog')
    expect(yml).toContain('path: blog')
    expect(yml).toContain('configure-pages@v5')
  })
})
