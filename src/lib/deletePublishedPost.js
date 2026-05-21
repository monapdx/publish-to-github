import { BLOG_INDEX, postRepoPath } from './blogPaths'
import { removeCardBySlug } from './blogIndex'
import {
  deleteFile,
  fetchRepoFileText,
  getFileSha,
  upsertFile,
  validateGithubConnection,
} from './github'
import { getFriendlyGithubError } from './githubFriendlyMessages'
import { PublishValidationError } from './publishTemplates'
import { slugify } from './slugify'

function normalizeDeleteSlug(slugInput) {
  return slugify(String(slugInput ?? '').trim())
}

/**
 * Delete a published post file and remove its card from blog/index.html.
 * @param {{ form: { token: string, owner: string, repo: string, branch?: string }, slug: string }} opts
 */
export async function deletePublishedPost({ form, slug: slugInput }) {
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

  const slug = normalizeDeleteSlug(slugInput)
  if (!slug) {
    throw new PublishValidationError('Add a slug before deleting a published post.')
  }

  const postPath = postRepoPath(slug)
  const indexPath = BLOG_INDEX
  const postFileLabel = `blog/posts/${slug}.html`

  const postSha = await getFileSha({ token, owner, repo, path: postPath, branch })
  if (!postSha) {
    throw new PublishValidationError(`Could not find ${postFileLabel}`)
  }

  await deleteFile({
    token,
    owner,
    repo,
    path: postPath,
    branch,
    message: `Delete: ${slug}`,
    sha: postSha,
  })

  let indexHtml = ''
  let indexSha = null
  try {
    const indexRes = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
    indexHtml = indexRes.text
    indexSha = indexRes.sha
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'fetch')
    return {
      successMessage:
        'Post file was deleted, but blog/index.html could not be updated. Remove the card manually.',
      postDeleted: true,
      indexUpdated: false,
      indexUpdateReason: friendly,
      postPath,
      indexPath,
    }
  }

  const cardResult = removeCardBySlug(indexHtml, slug)
  if (!cardResult.removed) {
    return {
      successMessage:
        'Post file was deleted, but blog/index.html could not be updated. Remove the card manually.',
      postDeleted: true,
      indexUpdated: false,
      indexUpdateReason: cardResult.reason,
      postPath,
      indexPath,
    }
  }

  try {
    await upsertFile({
      token,
      owner,
      repo,
      path: indexPath,
      branch,
      content: cardResult.html,
      message: `Index: remove ${slug}`,
      sha: indexSha,
    })
  } catch (err) {
    const { friendly } = getFriendlyGithubError(err, 'publish')
    return {
      successMessage:
        'Post file was deleted, but blog/index.html could not be updated. Remove the card manually.',
      postDeleted: true,
      indexUpdated: false,
      indexUpdateReason: friendly,
      postPath,
      indexPath,
    }
  }

  return {
    successMessage: `Deleted ${postFileLabel} and removed the post card from blog/index.html.`,
    postDeleted: true,
    indexUpdated: true,
    indexUpdateReason: cardResult.reason,
    postPath,
    indexPath,
  }
}
