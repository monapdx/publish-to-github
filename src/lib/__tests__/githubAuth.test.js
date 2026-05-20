import { describe, expect, it } from 'vitest'
import { normalizeGithubToken } from '../github'

describe('normalizeGithubToken', () => {
  it('trims whitespace around pasted tokens', () => {
    expect(normalizeGithubToken('  github_pat_abc  ')).toBe('github_pat_abc')
    expect(normalizeGithubToken('github_pat_abc\n')).toBe('github_pat_abc')
  })
})
