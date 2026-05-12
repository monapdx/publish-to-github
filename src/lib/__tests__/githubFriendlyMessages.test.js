import { describe, expect, it } from 'vitest'
import { GitHubApiError } from '../github'
import { getFriendlyGithubError } from '../githubFriendlyMessages'

describe('getFriendlyGithubError', () => {
  it('maps 401 to token guidance', () => {
    const err = new GitHubApiError('nope', { status: 401, bodyText: 'Bad credentials' })
    const { friendly } = getFriendlyGithubError(err, 'publish')
    expect(friendly).toMatch(/token/i)
  })

  it('maps 404 in list context to posts folder copy', () => {
    const err = new GitHubApiError('Not Found', { status: 404 })
    const { friendly } = getFriendlyGithubError(err, 'list')
    expect(friendly).toMatch(/folder|posts/i)
  })

  it('falls back for unknown errors', () => {
    const { friendly } = getFriendlyGithubError(new Error('weird'), 'generic')
    expect(friendly.length).toBeGreaterThan(0)
  })
})
