import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRepoFileText, GitHubApiError, upsertFile } from '../github'

const options = {
  token: ' token ', owner: 'owner', repo: 'repo',
  path: 'blog/posts/a post.html', branch: 'feature/posts',
}
const blobUrl = 'https://api.github.com/repos/owner/repo/git/blobs/large'
const metadata = (data) => ({ ok: true, status: 200, json: async () => data })

afterEach(() => vi.unstubAllGlobals())

describe('fetchRepoFileText', () => {
  it('decodes inline UTF-8 content without an extra request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(metadata({
      sha: 'small', encoding: 'base64', content: 'PHA+Y2Fmw6k8L3A+\n',
    }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRepoFileText(options)).resolves.toEqual({ sha: 'small', text: '<p>café</p>' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('loads blob content when GitHub omits content for a large post', async () => {
    const html = '<h1>A published post</h1><p>Full body — café</p>'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(metadata({ sha: 'large', size: 4544867, content: '', encoding: 'none' }))
      .mockResolvedValueOnce(metadata({ encoding: 'base64', content: btoa(String.fromCharCode(...new TextEncoder().encode(html))) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRepoFileText(options)).resolves.toEqual({ sha: 'large', text: html })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(2, blobUrl, { headers: {
      Accept: 'application/vnd.github+json', Authorization: 'Bearer token',
      'X-GitHub-Api-Version': '2022-11-28',
    } })
  })

  it('preserves a genuinely empty file without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(metadata({ sha: 'empty', encoding: 'base64', content: '', size: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchRepoFileText(options)).resolves.toEqual({ sha: 'empty', text: '' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('propagates blob-fetch failures instead of returning an empty post', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(metadata({ sha: 'large', content: '', encoding: 'none' }))
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Permission denied' }))
    await expect(fetchRepoFileText(options)).rejects.toMatchObject({
      name: 'GitHubApiError', status: 403, bodyText: 'Permission denied',
    })
  })

  it('keeps file-not-found errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'Not Found' }))
    await expect(fetchRepoFileText(options)).rejects.toBeInstanceOf(GitHubApiError)
  })

  it('rejects directory paths', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(metadata([])))
    await expect(fetchRepoFileText(options)).rejects.toThrow('Expected a file path, not a directory')
  })
})


it('uploads already-base64 image bytes without encoding them as text', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  vi.stubGlobal('fetch', fetchMock)
  await upsertFile({ ...options, content: 'AP+AAQ==', encoding: 'base64', message: 'Upload image' })
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toBe('AP+AAQ==')
})

it('loads inline binary image data without decoding it as UTF-8', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(metadata({ sha: 'image', encoding: 'base64', content: 'AP+AAQ==\n' })))
  await expect(fetchRepoFileText({ ...options, encoding: 'base64' })).resolves.toEqual({ sha: 'image', text: 'AP+AAQ==' })
})

it('loads large binary image data through the blob fallback', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(metadata({ sha: 'image', encoding: 'none', content: '' }))
    .mockResolvedValueOnce(metadata({ encoding: 'base64', content: 'AP+AAQ==' })))
  await expect(fetchRepoFileText({ ...options, encoding: 'base64' })).resolves.toEqual({ sha: 'image', text: 'AP+AAQ==' })
})


it('rejects metadata returned by the fallback instead of loading JSON as a post', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(metadata({ sha: 'large', encoding: 'none', content: '' }))
    .mockResolvedValueOnce(metadata({ sha: 'large', encoding: 'none', content: '', size: 4544867 })))
  await expect(fetchRepoFileText(options)).rejects.toThrow('metadata instead of file content')
})
