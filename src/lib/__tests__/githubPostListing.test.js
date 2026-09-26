import { afterEach, describe, expect, it, vi } from 'vitest'
import { listPostHtmlFiles } from '../github'

afterEach(() => vi.unstubAllGlobals())

describe('published post listing', () => {
  it('combines legacy blog root posts with blog/posts files and excludes index', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [
        { type: 'file', name: 'index.html', path: 'blog/index.html' },
        { type: 'file', name: 'old.html', path: 'blog/old.html', sha: 'a' },
      ] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [
        { type: 'file', name: 'new.html', path: 'blog/posts/new.html', sha: 'b' },
      ] })
    vi.stubGlobal('fetch', fetchMock)
    const files = await listPostHtmlFiles({ token: 'token', owner: 'owner', repo: 'repo', branch: 'main' })
    expect(files.map((file) => file.path)).toEqual(['blog/old.html', 'blog/posts/new.html'])
  })

  it('reads root posts when blog/posts does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [
        { type: 'file', name: 'old.html', path: 'blog/old.html', sha: 'a' },
      ] })
      .mockResolvedValueOnce({ ok: false, status: 404 }))
    const files = await listPostHtmlFiles({ token: 'token', owner: 'owner', repo: 'repo', branch: 'main' })
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('blog/old.html')
  })
})
