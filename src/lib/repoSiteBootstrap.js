import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import {
  BLOG_ROOT_DIR,
  DEFAULT_POSTS_PATH,
  normalizePostsPathInput,
  resolveBlogIndexPath,
  resolveBlogRoot,
  resolvePostsDirectory,
} from './blogPaths'
import { fetchRepoFileText, getFileSha, upsertFile } from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import {
  MARKER_END,
  MARKER_START,
  analyzeIndexMarkers,
  ensureBlogPostMarkers,
} from './blogIndex'
import { replaceTemplateVars } from './templateVars'

const LEGACY_MARKER_START = /<!--\s*BLOG_EDITOR_POSTS_START\s*-->/gi
const LEGACY_MARKER_END = /<!--\s*BLOG_EDITOR_POSTS_END\s*-->/gi
const LEGACY_HYPHEN_START = /<!--\s*BLOG-POSTS-START\s*-->/gi
const LEGACY_HYPHEN_END = /<!--\s*BLOG-POSTS-END\s*-->/gi

export const BLOG_STYLESHEET_FILE = 'style.css'
export const BLOG_STYLESHEET_HREF = 'style.css'

export function joinRepoPath(dir, file) {
  if (!dir) return file
  return `${dir.replace(/\/+$/, '')}/${file}`
}

/**
 * Prepare templates/index.html for blog/index.html (markers, stylesheet path, no sample card).
 */
export function prepareDesignIndexHtml(raw, stylesheetHref = BLOG_STYLESHEET_HREF) {
  let html = String(raw)
  html = html.replace(LEGACY_MARKER_START, MARKER_START)
  html = html.replace(LEGACY_MARKER_END, MARKER_END)
  html = html.replace(LEGACY_HYPHEN_START, MARKER_START)
  html = html.replace(LEGACY_HYPHEN_END, MARKER_END)

  html = html.replace(/href\s*=\s*["']\.\.\/styles\.css["']/gi, `href="${stylesheetHref}"`)
  html = html.replace(/href\s*=\s*["']styles\.css["']/gi, `href="${stylesheetHref}"`)
  html = html.replace(/href\s*=\s*["']style\.css["']/gi, `href="${stylesheetHref}"`)

  const analysis = analyzeIndexMarkers(html)
  if (analysis.kind === 'ok') {
    const { startStr, startIdx, endIdx } = analysis
    const before = html.slice(0, startIdx + startStr.length)
    const after = html.slice(endIdx)
    html = `${before}\n      \n${after}`
  }

  return html
}

export function buildStarterIndexHtml(opts = {}) {
  const year = String(new Date().getFullYear())
  return replaceTemplateVars(READ_ONLY_TEMPLATES.indexStarterHtml, {
    BLOG_TITLE: opts.blogTitle || 'Blog',
    BLOG_DESCRIPTION:
      opts.blogDescription || 'Posts published with Publish to GitHub',
    STYLESHEET: opts.stylesheetHref || BLOG_STYLESHEET_HREF,
    YEAR: year,
  })
}

export function addBlogSectionIfNeeded(indexHtml) {
  if (analyzeIndexMarkers(indexHtml).kind === 'ok') {
    return { html: indexHtml, added: false }
  }

  const section = `
  <main class="nb-stack-md">
    <section class="post-list nb-stack-sm">
${MARKER_START}
${MARKER_END}
    </section>
  </main>`

  if (/<\/body>/i.test(indexHtml)) {
    return {
      html: indexHtml.replace(/<\/body>/i, `${section}\n</body>`),
      added: true,
    }
  }
  return { html: `${indexHtml}\n${section}`, added: true }
}

export function prepareExistingIndexHtml(indexHtml) {
  let html = String(indexHtml)
  let markersAdded = false
  let sectionAdded = false

  html = html.replace(LEGACY_MARKER_START, MARKER_START)
  html = html.replace(LEGACY_MARKER_END, MARKER_END)
  html = html.replace(LEGACY_HYPHEN_START, MARKER_START)
  html = html.replace(LEGACY_HYPHEN_END, MARKER_END)

  const wrapped = ensureBlogPostMarkers(html)
  html = wrapped.html
  markersAdded = wrapped.added

  if (analyzeIndexMarkers(html).kind !== 'ok') {
    const section = addBlogSectionIfNeeded(html)
    html = section.html
    sectionAdded = section.added
    const wrapped2 = ensureBlogPostMarkers(html)
    html = wrapped2.html
    markersAdded = markersAdded || wrapped2.added
  }

  return { html, markersAdded, sectionAdded, modified: markersAdded || sectionAdded }
}

async function copyIfMissing({ token, owner, repo, branch, path, content, message, created }) {
  const sha = await getFileSha({ token, owner, repo, path, branch })
  if (sha) return null
  await upsertFile({
    token,
    owner,
    repo,
    path,
    branch,
    content,
    message,
    sha: null,
  })
  created.push(path)
  return path
}

/** Repo path for the blog GitHub Pages workflow (created on first publish if missing). */
export const GITHUB_PAGES_WORKFLOW_PATH = '.github/workflows/deploy-blog-pages.yml'

export const GITHUB_PAGES_SETUP_HINT =
  'Enable GitHub Pages: repo Settings → Pages → Build and deployment → Source → GitHub Actions, then check the Actions tab for “Deploy blog to GitHub Pages”.'

/** YAML-safe branch name for workflow `on.push.branches`. */
export function formatWorkflowBranch(branch) {
  const b = String(branch ?? '').trim() || 'main'
  if (/^[a-zA-Z0-9._/-]+$/.test(b)) return b
  return `"${b.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Workflow that publishes blog/index.html (entire blog/ folder) via GitHub Actions Pages.
 * Assumes Pages is not configured yet — user must set Source to GitHub Actions once.
 */
export function buildPagesDeployWorkflow(publishDirectory = BLOG_ROOT_DIR, branch = 'main') {
  const dir = resolveBlogRoot(`${publishDirectory}/`)
  const branchRef = formatWorkflowBranch(branch)
  return READ_ONLY_TEMPLATES.githubPagesWorkflowYaml.replace(/\{\{BLOG_DIR\}\}/g, dir).replace(
    /\{\{BRANCH\}\}/g,
    branchRef,
  )
}

/** @deprecated Use resolveBlogIndexPath */
export function blogIndexPath(postsPath) {
  return resolveBlogIndexPath({ postsPath })
}

export function blogStylePath(postsPath) {
  return joinRepoPath(resolveBlogRoot(postsPath), BLOG_STYLESHEET_FILE)
}

export function blogNojekyllPath(postsPath) {
  return joinRepoPath(resolveBlogRoot(postsPath), '.nojekyll')
}

export function blogPostsDirPath(postsPath) {
  return resolvePostsDirectory(postsPath)
}

/**
 * Bootstrap /blog on the repo: index from templates/index.html, posts under /blog/posts/.
 */
export async function bootstrapBlogSite({
  token,
  owner,
  repo,
  branch,
  postsPath,
}) {
  const blogDir = resolveBlogRoot(postsPath)
  const postsDir = resolvePostsDirectory(postsPath)
  const indexPath = resolveBlogIndexPath({ postsPath })
  const stylePath = blogStylePath(postsPath)
  const nojekyllPath = blogNojekyllPath(postsPath)
  const postsKeepPath = joinRepoPath(postsDir, '.gitkeep')
  const workflowPath = GITHUB_PAGES_WORKFLOW_PATH
  const filesCreated = []
  const bootstrapWarnings = []

  await copyIfMissing({
    token,
    owner,
    repo,
    branch,
    path: stylePath,
    content: READ_ONLY_TEMPLATES.stylesCss,
    message: 'Add blog/style.css from editor templates',
    created: filesCreated,
  })

  await copyIfMissing({
    token,
    owner,
    repo,
    branch,
    path: postsKeepPath,
    content: '',
    message: 'Create blog/posts folder',
    created: filesCreated,
  })

  let indexCreated = false
  let indexModified = false
  let markersAdded = false
  let sectionAdded = false
  let indexText = ''
  let indexSha = null

  const existingIndexSha = await getFileSha({ token, owner, repo, path: indexPath, branch })

  if (!existingIndexSha) {
    indexText = prepareDesignIndexHtml(READ_ONLY_TEMPLATES.indexDesignHtml, BLOG_STYLESHEET_HREF)
    await upsertFile({
      token,
      owner,
      repo,
      path: indexPath,
      branch,
      content: indexText,
      message: 'Create blog/index.html from templates/index.html',
      sha: null,
    })
    filesCreated.push(indexPath)
    indexCreated = true
    indexSha = await getFileSha({ token, owner, repo, path: indexPath, branch })
  } else {
    const res = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
    indexText = res.text
    indexSha = res.sha
    const prep = prepareExistingIndexHtml(indexText)
    indexText = prep.html
    indexModified = prep.modified
    markersAdded = prep.markersAdded
    sectionAdded = prep.sectionAdded
  }

  await copyIfMissing({
    token,
    owner,
    repo,
    branch,
    path: nojekyllPath,
    content: '',
    message: 'Add .nojekyll for GitHub Pages',
    created: filesCreated,
  })

  try {
    await copyIfMissing({
      token,
      owner,
      repo,
      branch,
      path: workflowPath,
      content: buildPagesDeployWorkflow(blogDir, branch),
      message: 'Add GitHub Pages workflow to publish blog/',
      created: filesCreated,
    })
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'publish')
    bootstrapWarnings.push(
      `${friendly} Blog files were still set up; add ${workflowPath} manually if needed.`,
    )
  }

  const pagesWorkflowCreated = filesCreated.includes(workflowPath)

  return {
    blogDir,
    postsDir,
    indexPath,
    indexText,
    indexSha,
    indexCreated,
    indexModified,
    markersAdded,
    sectionAdded,
    filesCreated,
    bootstrapWarnings,
    pagesWorkflowCreated,
    pagesWorkflowPath: workflowPath,
    pagesSetupHint: pagesWorkflowCreated ? GITHUB_PAGES_SETUP_HINT : null,
    stylesheetHref: BLOG_STYLESHEET_HREF,
    postsPath: normalizePostsPathInput(postsPath),
  }
}

/** @deprecated */
export async function loadOrCreateIndexHtml(args) {
  return bootstrapBlogSite(args)
}

export function buildPublishSuccessMessage({
  postPath,
  indexPath,
  indexCreated,
  filesCreated,
  markersAdded,
}) {
  const parts = [`Published post: ${postPath}`, `Index: ${indexPath}`]
  if (indexCreated) parts.push('(new blog/index.html from templates)')
  if (markersAdded) parts.push('(added post markers)')
  if (filesCreated.length > 0) {
    parts.push(`Bootstrapped: ${filesCreated.join(', ')}`)
  }
  return parts.join(' · ')
}
