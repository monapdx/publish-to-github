import {
  BLOG_INDEX,
  BLOG_NOJEKYLL,
  BLOG_POSTS_GITKEEP,
  BLOG_ROOT,
  BLOG_STYLE,
  PAGES_WORKFLOW,
} from './blogPaths'
import { READ_ONLY_TEMPLATES } from './readOnlyTemplates'
import { fetchRepoFileText, getFileSha, upsertFile } from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import {
  MARKER_END,
  MARKER_START,
  analyzeIndexMarkers,
  ensureBlogPostMarkers,
} from './blogIndex'

export const PAGES_SETUP_HINT =
  'Enable GitHub Pages: Settings → Pages → Source → GitHub Actions, then run “Deploy blog to GitHub Pages” in Actions.'

async function putIfMissing({ token, owner, repo, branch, path, content, message, created }) {
  if (await getFileSha({ token, owner, repo, path, branch })) return
  await upsertFile({ token, owner, repo, path, branch, content, message, sha: null })
  created.push(path)
}

function workflowYaml(branch) {
  const b = String(branch ?? '').trim() || 'main'
  const branchRef = /^[a-zA-Z0-9._/-]+$/.test(b) ? b : `"${b.replace(/"/g, '\\"')}"`
  return READ_ONLY_TEMPLATES.githubPagesWorkflowYaml
    .replace(/\{\{BLOG_DIR\}\}/g, BLOG_ROOT)
    .replace(/\{\{BRANCH\}\}/g, branchRef)
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

/** Ensure blog/, starter files, and the Pages workflow exist. */
export async function bootstrapBlogSite({ token, owner, repo, branch }) {
  const created = []
  const warnings = []

  await putIfMissing({
    token,
    owner,
    repo,
    branch,
    path: BLOG_STYLE,
    content: READ_ONLY_TEMPLATES.stylesCss,
    message: 'Add blog/style.css',
    created,
  })
  await putIfMissing({
    token,
    owner,
    repo,
    branch,
    path: BLOG_POSTS_GITKEEP,
    content: '',
    message: 'Create blog/posts',
    created,
  })
  await putIfMissing({
    token,
    owner,
    repo,
    branch,
    path: BLOG_NOJEKYLL,
    content: '',
    message: 'Add blog/.nojekyll',
    created,
  })

  let indexCreated = false
  let indexModified = false
  let indexText = ''
  let indexSha = null

  if (!(await getFileSha({ token, owner, repo, path: BLOG_INDEX, branch }))) {
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
    created.push(BLOG_INDEX)
    indexCreated = true
    indexSha = await getFileSha({ token, owner, repo, path: BLOG_INDEX, branch })
  } else {
    const res = await fetchRepoFileText({ token, owner, repo, path: BLOG_INDEX, branch })
    indexText = res.text
    indexSha = res.sha
    const prep = prepareIndex(indexText)
    indexText = prep.html
    indexModified = prep.modified
  }

  try {
    await putIfMissing({
      token,
      owner,
      repo,
      branch,
      path: PAGES_WORKFLOW,
      content: workflowYaml(branch),
      message: 'Add GitHub Pages workflow',
      created,
    })
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'publish')
    warnings.push(`${friendly} Add ${PAGES_WORKFLOW} manually if needed.`)
  }

  const workflowCreated = created.includes(PAGES_WORKFLOW)

  return {
    indexText,
    indexSha,
    indexCreated,
    indexModified,
    created,
    warnings,
    pagesSetupHint: workflowCreated ? PAGES_SETUP_HINT : null,
  }
}
