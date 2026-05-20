import { getFileSha, upsertFile, validateGithubConnection } from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import { tryUpdateIndexWithCard } from './blogIndex'
import {
  PublishValidationError,
  buildPublishTemplateData,
  renderPostCardHtml,
  renderPostPageHtml,
  validatePublishInputs,
} from './publishTemplates'
import { bootstrapBlogSite, buildPublishSuccessMessage } from './repoSiteBootstrap'

export const INDEX_MARKER_BANNER_TEXT =
  'Your post was published, but it was not added to blog/index.html because the post markers could not be placed correctly. Add <!-- BLOG_POSTS_START --> and <!-- BLOG_POSTS_END --> around your post cards.'

/**
 * Bootstrap blog/ on GitHub from read-only app templates, publish post HTML, update index card.
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
  let token = form.token.trim()
  let owner = form.owner.trim()
  let repo = form.repo.trim()
  let branch = (form.branch || '').trim() || 'main'

  try {
    const validated = await validateGithubConnection({ token, owner, repo, branch })
    token = validated.token
    owner = validated.owner
    repo = validated.repo
    branch = validated.branch
  } catch (err) {
    const { friendly, technical } = getFriendlyGithubError(err, 'publish')
    throw new PublishValidationError(
      `${friendly} Open Help → “How to create a token” for fine-grained permission steps.\n\n${technical}`,
    )
  }

  const { title: safeTitle, content: safeContent, slug } = validatePublishInputs({
    title,
    content,
    slug: s,
  })

  const site = await bootstrapBlogSite({
    token,
    owner,
    repo,
    branch,
    postsPath: form.postsPath,
  })

  const templateData = buildPublishTemplateData({
    title: safeTitle,
    slug,
    content: safeContent,
    excerpt,
    category,
    categoryClass: categoryClass || 'nb-bg-pink',
    postRepoPath: path,
    indexRepoPath: site.indexPath,
    date: new Date(),
    stylesheetHref: site.stylesheetHref,
  })

  const postHtml = renderPostPageHtml(templateData)
  const cardHtml = renderPostCardHtml(templateData)

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
  let indexUpdated = false

  try {
    const indexResult = tryUpdateIndexWithCard({
      indexHtml: site.indexText,
      cardHtml,
      slug: templateData.SLUG,
      fileName: path.split('/').pop() || `${slug}.html`,
    })

    if (!indexResult.updated) {
      indexHomeBanner = { show: true, text: INDEX_MARKER_BANNER_TEXT }
    } else {
      indexUpdated = true
      const shouldWriteIndex =
        site.indexCreated || site.indexModified || indexResult.markersAdded || indexResult.updated
      if (shouldWriteIndex) {
        await upsertFile({
          token,
          owner,
          repo,
          path: site.indexPath,
          branch,
          content: indexResult.indexHtml,
          message: site.indexCreated
            ? 'Create blog index with first post'
            : `Index: add ${templateData.SLUG}`,
          sha: site.indexSha,
        })
      }
    }
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'index')
    indexErrorToast = `${friendly} Your post file was still saved; only blog/index.html could not be updated.`
  }

  let successMessage = buildPublishSuccessMessage({
    postPath: path,
    indexPath: site.indexPath,
    indexCreated: site.indexCreated,
    filesCreated: site.filesCreated,
    markersAdded: site.markersAdded || site.sectionAdded,
  })
  if (site.bootstrapWarnings?.length) {
    successMessage += ` Note: ${site.bootstrapWarnings[0]}`
  }

  return {
    path,
    indexPath: site.indexPath,
    indexCreated: site.indexCreated,
    indexUpdated,
    filesCreated: site.filesCreated,
    bootstrapWarnings: site.bootstrapWarnings ?? [],
    indexHomeBanner,
    indexErrorToast,
    successMessage,
  }
}
