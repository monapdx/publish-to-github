import { serializePost } from './postSerializer'
import { GitHubApiError, fetchRepoFileText, getFileSha, upsertFile } from './github'
import { defaultIndexHtml, getIndexPath, tryUpdateIndexWithNewPost } from './blogIndex'
import { loadIndexEntryTemplate } from './indexEntryTemplate'
import { getFriendlyGithubError } from './githubFriendlyMessages'

export const INDEX_MARKER_BANNER_TEXT =
  'Your post was published, but it was not added to index.html because the blog post markers were not found (or there are duplicates / order problems). Use Edit homepage to add <!-- BLOG-POSTS-START --> and <!-- BLOG-POSTS-END --> where you want new posts to appear.'

/**
 * Publish the post file, then best-effort update blog/index.html between markers.
 * Index failures do not throw; they return banner or toast copy for the UI.
 *
 * @param {{
 *   form: { token: string, owner: string, repo: string, branch: string, postsPath: string },
 *   path: string,
 *   slug: string,
 *   title: string,
 *   content: string,
 *   excerpt: string,
 *   category: string,
 *   postTemplateHtml: string,
 * }} args
 * @returns {Promise<{ path: string, indexHomeBanner: { show: boolean, text: string }, indexErrorToast: string | null }>}
 */
export async function publishPostAndIndex({
  form,
  path,
  slug: s,
  title,
  content,
  excerpt,
  category,
  postTemplateHtml,
}) {
  const token = form.token.trim()
  const owner = form.owner.trim()
  const repo = form.repo.trim()
  const branch = (form.branch || '').trim() || 'main'

  const html = serializePost({
    title: title.trim() || 'Untitled',
    content,
    excerpt: excerpt.trim(),
    category: category.trim(),
    slug: s,
    date: new Date().toISOString(),
    templateHtml: postTemplateHtml,
  })

  const sha = await getFileSha({ token, owner, repo, path, branch })
  await upsertFile({
    token,
    owner,
    repo,
    path,
    branch,
    content: html,
    message: `Publish: ${title.trim() || path}`,
    sha,
  })

  let indexHomeBanner = { show: false, text: '' }
  let indexErrorToast = null

  try {
    const indexPath = getIndexPath(form.postsPath)
    let indexText = ''
    let indexSha = null
    try {
      const res = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
      indexText = res.text
      indexSha = res.sha
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) {
        indexText = defaultIndexHtml()
        indexSha = null
      } else {
        throw err
      }
    }

    const fileName = path.split('/').pop() || `${s}.html`
    const entryTemplate = loadIndexEntryTemplate()
    const indexResult = tryUpdateIndexWithNewPost({
      indexHtml: indexText,
      fileName,
      title: title.trim() || 'Untitled',
      excerpt: excerpt.trim(),
      category: category.trim(),
      date: new Date().toISOString(),
      entryTemplate,
    })

    if (!indexResult.updated) {
      indexHomeBanner = { show: true, text: INDEX_MARKER_BANNER_TEXT }
    } else {
      indexHomeBanner = { show: false, text: '' }
      await upsertFile({
        token,
        owner,
        repo,
        path: indexPath,
        branch,
        content: indexResult.indexHtml,
        message: `Index: add ${fileName}`,
        sha: indexSha,
      })
    }
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'index')
    indexErrorToast = `${friendly} Your post file was still saved; only the homepage (index.html) could not be updated.`
  }

  return { path, indexHomeBanner, indexErrorToast }
}
