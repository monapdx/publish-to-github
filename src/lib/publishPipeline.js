import { GitHubApiError, fetchRepoFileText, getFileSha, upsertFile } from './github'
import { tryUpdateIndexWithCard } from './blogIndex'
import { resolveIndexPath } from './indexPagePath'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import {
  PublishValidationError,
  buildPublishTemplateData,
  renderPostCardHtml,
  renderPostPageHtml,
  validatePublishInputs,
} from './publishTemplates'

export const INDEX_MARKER_BANNER_TEXT =
  'Your post was published, but it was not added to the blog index because the post markers were not found (or there are duplicates / order problems). Use Edit homepage to add <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> around your post cards.'

/**
 * Publish the post file from templates/post-page-template.html, then update the index
 * with templates/post-card-template.html.
 *
 * @param {{
 *   form: { token: string, owner: string, repo: string, branch: string, postsPath: string, indexPagePath?: string },
 *   path: string,
 *   slug: string,
 *   title: string,
 *   content: string,
 *   excerpt: string,
 *   category: string,
 *   categoryClass?: string,
 * }} args
 */
export async function publishPostAndIndex({
  form,
  path,
  slug: s,
  title,
  content,
  excerpt,
  category,
  categoryClass,
}) {
  const token = form.token.trim()
  const owner = form.owner.trim()
  const repo = form.repo.trim()
  const branch = (form.branch || '').trim() || 'main'

  const { title: safeTitle, content: safeContent, slug } = validatePublishInputs({
    title,
    content,
    slug: s,
  })

  const indexPath = resolveIndexPath(form)

  let indexText = ''
  let indexSha = null
  try {
    const res = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
    indexText = res.text
    indexSha = res.sha
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      throw new PublishValidationError(
        `Blog index file not found at ${indexPath}. Create it on GitHub or set the correct blog index path in Code view.`,
      )
    }
    throw err
  }

  const templateData = buildPublishTemplateData({
    title: safeTitle,
    slug,
    content: safeContent,
    excerpt,
    category,
    categoryClass: categoryClass || 'nb-bg-pink',
    postRepoPath: path,
    indexRepoPath: indexPath,
    date: new Date(),
  })

  const postHtml = renderPostPageHtml(templateData)
  const cardHtml = renderPostCardHtml(templateData)

  const sha = await getFileSha({ token, owner, repo, path, branch })
  await upsertFile({
    token,
    owner,
    repo,
    path,
    branch,
    content: postHtml,
    message: `Publish: ${safeTitle}`,
    sha,
  })

  let indexHomeBanner = { show: false, text: '' }
  let indexErrorToast = null

  try {
    const indexResult = tryUpdateIndexWithCard({
      indexHtml: indexText,
      cardHtml,
      slug: templateData.SLUG,
      fileName: path.split('/').pop() || `${slug}.html`,
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
        message: `Index: add ${templateData.SLUG}`,
        sha: indexSha,
      })
    }
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'index')
    indexErrorToast = `${friendly} Your post file was still saved; only the blog index could not be updated.`
  }

  return { path, indexHomeBanner, indexErrorToast }
}
