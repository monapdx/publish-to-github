import {
  BLOG_INDEX,
  BLOG_NOJEKYLL,
  BLOG_POSTS_GITKEEP,
  BLOG_STYLE,
  PAGES_WORKFLOW,
} from './blogPaths'
import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { fetchRepoFileText, getFileSha, upsertFile } from './github'
import {
  MARKER_END,
  MARKER_START,
  analyzeIndexMarkers,
  ensureBlogPostMarkers,
} from './blogIndex'

export const PAGES_SETUP_HINT =
  'Enable GitHub Pages: Settings → Pages → Source → GitHub Actions, then run “Deploy blog to GitHub Pages” in Actions.'

export const WORKFLOW_PERMISSION_WARNING =
  'Blog files were created, but the GitHub Pages workflow could not be added. Your GitHub token may need workflow permission. Add workflow permission to your token or create .github/workflows/deploy-blog-pages.yml manually.'

/** @typedef {'created' | 'found' | 'failed'} BootstrapFileStatus */

/**
 * @param {Array<{ path: string, status: BootstrapFileStatus }>} fileLog
 */
export function formatBootstrapStatusMessage(fileLog) {
  return fileLog
    .map(({ path, status }) => {
      if (status === 'created') return `${path} created`
      if (status === 'found') return `${path} found`
      return `${path} missing`
    })
    .join(' · ')
}

const WORKFLOW_ENABLEMENT_RE = /enablement:\s*true\b/

export function buildPagesWorkflowYaml(branch = 'main') {
  const b = String(branch ?? '').trim() || 'main'
  const branchRef = /^[a-zA-Z0-9._/-]+$/.test(b) ? b : `"${b.replace(/"/g, '\\"')}"`
  return READ_ONLY_TEMPLATES.githubPagesWorkflowYaml.replace(/\{\{BRANCH\}\}/g, branchRef)
}

export function workflowNeedsEnablementUpdate(existingYaml) {
  return !WORKFLOW_ENABLEMENT_RE.test(String(existingYaml ?? ''))
}

async function ensurePagesWorkflow({ token, owner, repo, branch, fileLog }) {
  const content = buildPagesWorkflowYaml(branch)
  const existingSha = await getFileSha({ token, owner, repo, path: PAGES_WORKFLOW, branch })

  if (existingSha) {
    try {
      const existing = await fetchRepoFileText({ token, owner, repo, path: PAGES_WORKFLOW, branch })
      if (!workflowNeedsEnablementUpdate(existing.text)) {
        fileLog.push({ path: PAGES_WORKFLOW, status: 'found' })
        return { workflowOk: true, workflowWarning: null }
      }
      await upsertFile({
        token,
        owner,
        repo,
        path: PAGES_WORKFLOW,
        branch,
        content,
        message: 'Update GitHub Pages workflow (enable Pages)',
        sha: existing.sha,
      })
      fileLog.push({ path: PAGES_WORKFLOW, status: 'created' })
      return { workflowOk: true, workflowWarning: null }
    } catch {
      fileLog.push({ path: PAGES_WORKFLOW, status: 'failed' })
      return { workflowOk: false, workflowWarning: WORKFLOW_PERMISSION_WARNING }
    }
  }

  try {
    await upsertFile({
      token,
      owner,
      repo,
      path: PAGES_WORKFLOW,
      branch,
      content,
      message: 'Add GitHub Pages workflow for blog/',
      sha: null,
    })
    const verified = await getFileSha({ token, owner, repo, path: PAGES_WORKFLOW, branch })
    if (verified) {
      fileLog.push({ path: PAGES_WORKFLOW, status: 'created' })
      return { workflowOk: true, workflowWarning: null }
    }
    fileLog.push({ path: PAGES_WORKFLOW, status: 'failed' })
    return { workflowOk: false, workflowWarning: WORKFLOW_PERMISSION_WARNING }
  } catch {
    fileLog.push({ path: PAGES_WORKFLOW, status: 'failed' })
    return { workflowOk: false, workflowWarning: WORKFLOW_PERMISSION_WARNING }
  }
}

async function recordFile({ token, owner, repo, branch, path, content, message, fileLog }) {
  const sha = await getFileSha({ token, owner, repo, path, branch })
  if (sha) {
    fileLog.push({ path, status: 'found' })
    return
  }
  await upsertFile({ token, owner, repo, path, branch, content, message, sha: null })
  fileLog.push({ path, status: 'created' })
}

function createIndexHtml() {
  let html = READ_ONLY_TEMPLATES.indexDesignHtml
  html = html.replace(/href="(?:\.\.\/)?styles\.css"/gi, 'href="style.css"')
  const a = analyzeIndexMarkers(html)
  if (a.kind === 'ok') {
    const before = html.slice(0, a.startIdx + a.startStr.length)
    const after = html.slice(a.endIdx)
    html = `${before}\n      \n${after}`
  }
  return html
}

function prepareIndex(html) {
  let h = String(html)
  const wrapped = ensureBlogPostMarkers(h)
  h = wrapped.html
  let modified = wrapped.added

  if (analyzeIndexMarkers(h).kind !== 'ok') {
    const section = `\n<section>\n${MARKER_START}\n${MARKER_END}\n</section>\n`
    h = /<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${section}</body>`) : `${h}${section}`
    h = ensureBlogPostMarkers(h).html
    modified = true
  }

  return { html: h, modified }
}

/**
 * Create blog/ starter files and .github/workflows/deploy-blog-pages.yml at repo root.
 */
export async function bootstrapBlogSite({ token, owner, repo, branch }) {
  /** @type {Array<{ path: string, status: BootstrapFileStatus }>} */
  const fileLog = []
  let workflowWarning = null
  let workflowOk = false

  await recordFile({
    token,
    owner,
    repo,
    branch,
    path: BLOG_STYLE,
    content: READ_ONLY_TEMPLATES.stylesCss,
    message: 'Add blog/style.css',
    fileLog,
  })
  await recordFile({
    token,
    owner,
    repo,
    branch,
    path: BLOG_POSTS_GITKEEP,
    content: '',
    message: 'Create blog/posts',
    fileLog,
  })
  const postsDirStatus = fileLog[fileLog.length - 1]?.status ?? 'failed'
  fileLog.push({ path: 'blog/posts/', status: postsDirStatus })
  await recordFile({
    token,
    owner,
    repo,
    branch,
    path: BLOG_NOJEKYLL,
    content: '',
    message: 'Add blog/.nojekyll',
    fileLog,
  })

  let indexCreated = false
  let indexModified = false
  let indexText = ''
  let indexSha = null

  const indexShaBefore = await getFileSha({ token, owner, repo, path: BLOG_INDEX, branch })
  if (!indexShaBefore) {
    indexText = createIndexHtml()
    await upsertFile({
      token,
      owner,
      repo,
      path: BLOG_INDEX,
      branch,
      content: indexText,
      message: 'Create blog/index.html',
      sha: null,
    })
    fileLog.push({ path: BLOG_INDEX, status: 'created' })
    indexCreated = true
    indexSha = await getFileSha({ token, owner, repo, path: BLOG_INDEX, branch })
  } else {
    fileLog.push({ path: BLOG_INDEX, status: 'found' })
    const res = await fetchRepoFileText({ token, owner, repo, path: BLOG_INDEX, branch })
    indexText = res.text
    indexSha = res.sha
    const prep = prepareIndex(indexText)
    indexText = prep.html
    indexModified = prep.modified
  }

  const workflowResult = await ensurePagesWorkflow({ token, owner, repo, branch, fileLog })
  workflowOk = workflowResult.workflowOk
  workflowWarning = workflowResult.workflowWarning

  return {
    indexText,
    indexSha,
    indexCreated,
    indexModified,
    fileLog,
    bootstrapStatusMessage: formatBootstrapStatusMessage(fileLog),
    workflowOk,
    workflowWarning,
    pagesSetupHint: workflowOk ? PAGES_SETUP_HINT : null,
  }
}
