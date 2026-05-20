import { describe, expect, it } from 'vitest'
import { PAGES_WORKFLOW } from '../blogPaths'
import {
  buildPagesWorkflowYaml,
  formatBootstrapStatusMessage,
  workflowNeedsEnablementUpdate,
} from '../repoSiteBootstrap'
import { READ_ONLY_TEMPLATES } from '../readOnlyTemplates'

describe('buildPagesWorkflowYaml', () => {
  it('deploys ./blog and targets the repo-root workflow path', () => {
    const yml = buildPagesWorkflowYaml('main')
    expect(yml).toContain('path: ./blog')
    expect(yml).toContain('branches: [main]')
    expect(yml).toContain('configure-pages@v5')
    expect(yml).toContain('enablement: true')
    expect(yml).toContain('name: Upload blog artifact')
    expect(READ_ONLY_TEMPLATES.githubPagesWorkflowYaml).toContain('./blog')
    expect(PAGES_WORKFLOW).toBe('.github/workflows/deploy-blog-pages.yml')
  })
})

describe('workflowNeedsEnablementUpdate', () => {
  it('flags workflows without enablement: true', () => {
    expect(workflowNeedsEnablementUpdate('uses: actions/configure-pages@v5')).toBe(true)
    expect(
      workflowNeedsEnablementUpdate('configure-pages@v5\n        with:\n          enablement: true'),
    ).toBe(false)
  })
})

describe('formatBootstrapStatusMessage', () => {
  it('lists created and found paths', () => {
    const msg = formatBootstrapStatusMessage([
      { path: 'blog/index.html', status: 'created' },
      { path: PAGES_WORKFLOW, status: 'failed' },
    ])
    expect(msg).toContain('blog/index.html created')
    expect(msg).toContain(`${PAGES_WORKFLOW} missing`)
  })
})
