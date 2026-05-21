import { BLOG_INDEX, postHref } from './blogPaths'
import { fetchRepoFileText, getFileSha, upsertFile, validateGithubConnection } from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import { MARKER_END, MARKER_START, tryUpdateIndexWithCard } from './blogIndex'
import {
  PublishValidationError,
  assertNoUnreplacedPlaceholders,
  buildPublishTemplateData,
  renderPostCardHtml,
  renderPostPageHtml,
  validatePublishInputs,
} from './publishTemplates'
import { hasUnreplacedPlaceholders } from './templatePlaceholders'
import { bootstrapBlogSite } from './repoSiteBootstrap'

export async function publishPostAndIndex({
  form,
  path,
  slug: slugInput,
  title,
  content,
  excerpt,
  category,
  categoryClass,
}) {
  let token = form.token.trim()
  let owner = form.owner.trim()
  let repo = form.repo.trim()
  let branch = (form.branch || '').trim() || 'main'

  try {
    ;({ token, owner, repo, branch } = await validateGithubConnection({
      token,
      owner,
      repo,
      branch,
    }))
  } catch (err) {
    const { friendly, technical } = getFriendlyGithubError(err, 'publish')
    throw new PublishValidationError(`${friendly}\n\n${technical}`)
  }

  const { title: safeTitle, content: safeContent, slug } = validatePublishInputs({
    title,
    content,
    slug: slugInput,
  })

  await bootstrapBlogSite({ token, owner, repo, branch })

  const templateData = buildPublishTemplateData({
    title: safeTitle,
    slug,
    content: safeContent,
    excerpt,
    category,
    categoryClass: categoryClass || 'nb-bg-pink',
  })

  const postHtml = renderPostPageHtml(templateData)
  const cardHtml = renderPostCardHtml(templateData)
  assertNoUnreplacedPlaceholders(cardHtml, 'Post card template')
  assertNoUnreplacedPlaceholders(postHtml, 'Post page template')

  const postSha = await getFileSha({ token, owner, repo, path, branch })
  await upsertFile({
    token,
    owner,
    repo,
    path,
    branch,
    content: postHtml,
    message: `Publish: ${safeTitle}`,
    sha: postSha,
  })

  const indexPath = BLOG_INDEX
  let indexHtml = ''
  let indexSha = null

  try {
    const indexRes = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
    indexHtml = indexRes.text
    indexSha = indexRes.sha
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'fetch')
    throw new PublishValidationError(
      `Post file was saved at ${path}, but blog/index.html could not be loaded from GitHub. ${friendly}`,
    )
  }

  console.log('Updating index:', indexPath)
  console.log('Post slug:', templateData.SLUG)
  console.log('Card HTML:', cardHtml)
  console.log('Index contains start marker:', indexHtml.includes(MARKER_START))
  console.log('Index contains end marker:', indexHtml.includes(MARKER_END))

  const indexResult = tryUpdateIndexWithCard({
    indexHtml,
    cardHtml,
    slug: templateData.SLUG,
    postHref: postHref(slug),
  })

  if (!indexResult.updated) {
    const reason = indexResult.reason || 'Index markers or layout could not be updated.'
    throw new PublishValidationError(
      `Post file was created, but blog/index.html was not updated. Reason: ${reason}`,
    )
  }

  if (hasUnreplacedPlaceholders(indexResult.indexHtml)) {
    throw new PublishValidationError(
      'Post file was created, but blog/index.html still contains unrendered {{placeholders}} after update.',
    )
  }

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

  const site = await bootstrapBlogSite({ token, owner, repo, branch })

  let successMessage = `Published ${path} · Index updated (${indexPath}) · ${indexResult.reason}`
  if (site.bootstrapStatusMessage) {
    successMessage += ` · ${site.bootstrapStatusMessage}`
  }
  if (site.pagesSetupHint && site.workflowOk) {
    successMessage += ` · ${site.pagesSetupHint}`
  }

  const publishedAt = new Date().toISOString()

  return {
    successMessage,
    workflowWarning: site.workflowWarning,
    workflowOk: site.workflowOk,
    postCreatedOrUpdated: true,
    indexUpdated: true,
    indexUpdateReason: indexResult.reason ?? 'Card inserted between BLOG_POSTS markers.',
    indexPath,
    postPath: path,
    path,
    slug,
    title: safeTitle,
    excerpt: String(excerpt ?? '').trim(),
    category: String(category ?? '').trim(),
    url: postHref(slug),
    publishedAt,
    indexHomeBanner: { show: false, text: '' },
    indexErrorToast: null,
  }
}
