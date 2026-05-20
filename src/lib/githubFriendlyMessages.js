import { GitHubApiError } from './github'

/**
 * Map GitHub API failures to plain-language copy for beginners.
 * @param {unknown} err
 * @param {'publish' | 'list' | 'fetch' | 'index' | 'generic'} context
 * @returns {{ friendly: string, technical: string }}
 */
export function getFriendlyGithubError(err, context = 'generic') {
  const status = err instanceof GitHubApiError ? err.status : extractStatusFromMessage(err)
  const bodyText = err instanceof GitHubApiError ? err.bodyText : ''
  const msg = String(err?.message || '')
  const combined = `${msg} ${bodyText}`.toLowerCase()

  const technical =
    err instanceof GitHubApiError
      ? [`HTTP ${err.status}`, err.bodyText || err.message].filter(Boolean).join('\n')
      : msg || String(err)

  if (status === 401 || combined.includes('bad credentials')) {
    return {
      friendly:
        'GitHub rejected your token. It may be expired, copied wrong, or not authorized for this repository. Fine-grained tokens must be created for the same GitHub account or organization that owns the repo.',
      technical,
    }
  }

  if (status === 403) {
    const fineGrainedHint = combined.includes('github_pat')
      ? ' Your token looks fine-grained — see Help for the exact permissions checklist.'
      : ''
    if (
      combined.includes('resource not accessible') ||
      combined.includes('permission') ||
      combined.includes('insufficient')
    ) {
      return {
        friendly: `GitHub blocked this request: the token does not have enough permission for this repository.${fineGrainedHint} For fine-grained tokens, set Repository access to this repo only, then enable: Contents (Read and write), Metadata (Read), and Workflows (Read and write) if the app should add the Pages deploy file.`,
        technical,
      }
    }
    return {
      friendly: `GitHub blocked this request. Your token may not include access to this repository or branch.${fineGrainedHint}`,
      technical,
    }
  }

  if (status === 404) {
    if (
      combined.includes('no commit found') ||
      combined.includes('unknown ref') ||
      combined.includes('no default branch')
    ) {
      return {
        friendly: 'This branch does not exist on GitHub yet, or the name does not match exactly.',
        technical,
      }
    }
    if (context === 'fetch') {
      return {
        friendly:
          'This file could not be found on GitHub. It may have been renamed, moved, or deleted.',
        technical,
      }
    }
    if (context === 'list') {
      return {
        friendly:
          'blog/posts/ could not be opened on GitHub. Publish once to create the blog folder, or check your branch.',
        technical,
      }
    }
    return {
      friendly:
        'This repository could not be found, or the branch is wrong. Check your GitHub username, repository name, and branch.',
      technical,
    }
  }

  if (status === 422) {
    return {
      friendly:
        'GitHub could not save this change (for example the file changed on the server at the same time). Try again, or refresh your published list.',
      technical,
    }
  }

  if (status === 429 || combined.includes('rate limit')) {
    return {
      friendly: 'GitHub asked you to slow down (rate limit). Wait a minute and try again.',
      technical,
    }
  }

  return {
    friendly: msg || 'Something went wrong while talking to GitHub.',
    technical,
  }
}

function extractStatusFromMessage(err) {
  const m = String(err?.message ?? err ?? '').match(/GitHub\s+(\d{3})\b/i)
  return m ? Number.parseInt(m[1], 10) : undefined
}
