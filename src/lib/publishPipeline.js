import { BLOG_INDEX, postHref } from './blogPaths'
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
  const data = buildPublishTemplateData({
    title: safeTitle,
    slug,
    content: safeContent,
    excerpt,
    category,
    categoryClass: categoryClass || 'nb-bg-pink',
  })

  const postHtml = renderPostPageHtml(data)
  const cardHtml = renderPostCardHtml(data)
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

  try {
    const indexResult = tryUpdateIndexWithCard({
      indexHtml: site.indexText,
      cardHtml,
      slug: data.SLUG,
      postHref: postHref(slug),
    })

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
        message: site.indexCreated ? 'Create blog index with first post' : `Index: add ${data.SLUG}`,
        sha: site.indexSha,
      })
    }
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'index')
    indexErrorToast = `${friendly} Post was saved; blog/index.html was not updated.`
  }

  let successMessage = `Published ${path}`
  if (site.created.length) successMessage += ` · Bootstrapped: ${site.created.join(', ')}`
  if (site.warnings[0]) successMessage += ` · ${site.warnings[0]}`
  if (site.pagesSetupHint) successMessage += ` ${site.pagesSetupHint}`

  return { successMessage, indexHomeBanner, indexErrorToast }
}
