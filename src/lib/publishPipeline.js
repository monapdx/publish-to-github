import { BLOG_INDEX, postHref } from './blogPaths'
import { getFileSha, upsertFile, validateGithubConnection } from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import { tryUpdateIndexWithCard } from './blogIndex'
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

const MARKER_BANNER =
  'Post saved, but blog/index.html was not updated. Add <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> around your post cards.'

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

  const site = await bootstrapBlogSite({ token, owner, repo, branch })

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

  let indexHomeBanner = { show: false, text: '' }
  let indexErrorToast = null
  let workflowWarning = site.workflowWarning

  try {
    const indexResult = tryUpdateIndexWithCard({
      indexHtml: site.indexText,
      cardHtml,
      slug: templateData.SLUG,
      postHref: postHref(slug),
    })

    if (hasUnreplacedPlaceholders(indexResult.indexHtml)) {
      throw new PublishValidationError(
        'blog/index.html still contains unrendered {{placeholders}} after update.',
      )
    }

    if (!indexResult.updated) {
      indexHomeBanner = { show: true, text: MARKER_BANNER }
    } else if (site.indexCreated || site.indexModified || indexResult.markersAdded) {
      await upsertFile({
        token,
        owner,
        repo,
        path: BLOG_INDEX,
        branch,
        content: indexResult.indexHtml,
        message: site.indexCreated
          ? 'Create blog index with first post'
          : `Index: add ${templateData.SLUG}`,
        sha: site.indexSha,
      })
    }
  } catch (err) {
    if (err instanceof PublishValidationError) throw err
    const { friendly } = getFriendlyGithubError(err, 'index')
    indexErrorToast = `${friendly} Post was saved; blog/index.html was not updated.`
  }

  let successMessage = `Published ${path} · ${site.bootstrapStatusMessage}`
  if (site.pagesSetupHint && site.workflowOk) {
    successMessage += ` · ${site.pagesSetupHint}`
  }

  return {
    successMessage,
    workflowWarning,
    workflowOk: site.workflowOk,
    indexHomeBanner,
    indexErrorToast,
  }
}
