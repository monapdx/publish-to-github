import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { GitHubApiError, fetchRepoFileText, getFileSha, upsertFile } from './github'
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

/** Repo path for the site stylesheet (copied from templates/styles.css). */
export const BLOG_STYLESHEET_FILE = 'style.css'
export const BLOG_STYLESHEET_HREF = 'style.css'

export function normalizeBlogDir(postsPath) {
  if (!postsPath || typeof postsPath !== 'string') return 'blog'
  let s = postsPath.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  s = s.replace(/\/+$/, '')
  return s || 'blog'
}

export function joinRepoPath(dir, file) {
  if (!dir) return file
  return `${dir.replace(/\/+$/, '')}/${file}`
}

export function blogIndexPath(postsPath) {
  return joinRepoPath(normalizeBlogDir(postsPath), 'index.html')
}

export function blogStylePath(postsPath) {
  return joinRepoPath(normalizeBlogDir(postsPath), BLOG_STYLESHEET_FILE)
}

export function blogNojekyllPath(postsPath) {
  return joinRepoPath(normalizeBlogDir(postsPath), '.nojekyll')
}

/**
 * GitHub Actions workflow: publish the blog folder as the Pages site root.
 * @param {string} publishDirectory e.g. blog
 */
export function buildPagesDeployWorkflow(publishDirectory = 'blog') {
  const dir = normalizeBlogDir(publishDirectory)
  return `name: Deploy blog to GitHub Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ${dir}
      - id: deploy
        uses: actions/deploy-pages@v4
`
}

/**
 * Copy templates/index-starter.html with placeholders filled (read-only source).
 */
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

/**
 * @param {string} indexHtml
 */
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

/**
 * Bootstrap TARGET_REPO/blog for GitHub Pages: copy starters from app /templates only.
 * Does not create blog/templates/ or modify app template files.
 *
 * @returns {Promise<{
 *   blogDir: string,
 *   indexPath: string,
 *   indexText: string,
 *   indexSha: string | null,
 *   indexCreated: boolean,
 *   indexModified: boolean,
 *   markersAdded: boolean,
 *   sectionAdded: boolean,
 *   filesCreated: string[],
 *   stylesheetHref: string,
 * }>}
 */
export async function bootstrapBlogSite({
  token,
  owner,
  repo,
  branch,
  postsPath,
  blogTitle,
}) {
  const blogDir = normalizeBlogDir(postsPath)
  const indexPath = blogIndexPath(postsPath)
  const stylePath = blogStylePath(postsPath)
  const nojekyllPath = blogNojekyllPath(postsPath)
  const workflowPath = '.github/workflows/deploy.yml'
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

  let indexCreated = false
  let indexModified = false
  let markersAdded = false
  let sectionAdded = false
  let indexText = ''
  let indexSha = null

  const existingIndexSha = await getFileSha({ token, owner, repo, path: indexPath, branch })

  if (!existingIndexSha) {
    indexText = buildStarterIndexHtml({
      blogTitle: blogTitle || 'Blog',
      stylesheetHref: BLOG_STYLESHEET_HREF,
    })
    await upsertFile({
      token,
      owner,
      repo,
      path: indexPath,
      branch,
      content: indexText,
      message: 'Create blog/index.html from index-starter template',
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
      content: buildPagesDeployWorkflow(blogDir),
      message: 'Add GitHub Pages deploy workflow for blog',
      created: filesCreated,
    })
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'publish')
    bootstrapWarnings.push(
      `${friendly} The blog files were still set up; you can add ${workflowPath} manually or grant Workflows (Read and write) on your fine-grained token.`,
    )
  }

  return {
    blogDir,
    indexPath,
    indexText,
    indexSha,
    indexCreated,
    indexModified,
    markersAdded,
    sectionAdded,
    filesCreated,
    bootstrapWarnings,
    stylesheetHref: BLOG_STYLESHEET_HREF,
  }
}

/** @deprecated Use bootstrapBlogSite */
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
  if (indexCreated) parts.push('(new blog/index.html)')
  if (markersAdded) parts.push('(added post markers)')
  if (filesCreated.length > 0) {
    parts.push(`Bootstrapped: ${filesCreated.join(', ')}`)
  }
  return parts.join(' · ')
}
