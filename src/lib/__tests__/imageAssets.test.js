// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { publishImageAssets, loadPublishedImageAssets } from '../imageAssets'
import { fetchRepoFileText, getFileSha, upsertFile } from '../github'

vi.mock('../github', () => ({ fetchRepoFileText: vi.fn(), getFileSha: vi.fn(), upsertFile: vi.fn() }))
const connection = { token: 'token', owner: 'owner', repo: 'repo', branch: 'main' }
const data = 'data:image/png;base64,AP+AAQ=='
const input = (content, path = 'blog/posts/post.html') => ({ ...connection, content, path })

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.clearAllMocks()
  getFileSha.mockResolvedValue(null)
  upsertFile.mockResolvedValue({})
})
afterEach(() => vi.unstubAllGlobals())

describe('published image assets', () => {
  it('uploads exact binary bytes once and links repeated images from posts/', async () => {
    const html = await publishImageAssets(input(`<p>Text</p><img src="${data}" alt="Photo" width="400"><img src="${data}">`))
    expect(upsertFile).toHaveBeenCalledTimes(1)
    const upload = upsertFile.mock.calls[0][0]
    expect(upload).toMatchObject({ ...connection, encoding: 'base64', content: 'AP+AAQ==' })
    expect(upload.path).toMatch(/^blog\/assets\/[a-f0-9]{64}\.png$/)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect([...doc.images].map(img => img.getAttribute('src'))).toEqual([
      `../assets/${upload.path.split('/').pop()}`, `../assets/${upload.path.split('/').pop()}`,
    ])
    expect(doc.images[0].getAttribute('alt')).toBe('Photo')
    expect(doc.images[0].getAttribute('width')).toBe('400')
    expect(html).not.toContain('data:image')
  })

  it('uses assets/ for legacy posts directly in blog/ and reuses existing files', async () => {
    getFileSha.mockResolvedValue('existing-sha')
    const html = await publishImageAssets(input(`<img src="${data}">`, 'blog/old.html'))
    expect(html).toMatch(/src="assets\/[a-f0-9]{64}\.png"/)
    expect(upsertFile).not.toHaveBeenCalled()
  })

  it('keeps external image URLs untouched', async () => {
    const html = '<img src="https://example.com/image.jpg" alt="External">'
    expect(await publishImageAssets(input(html))).toBe(html)
    expect(getFileSha).not.toHaveBeenCalled()
  })

  it('preserves SVG uploads as separate SVG files without converting other images to SVG', async () => {
    await publishImageAssets(input('<img src="data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E">'))
    expect(upsertFile.mock.calls[0][0]).toMatchObject({ content: btoa('<svg></svg>'), encoding: 'base64' })
    expect(upsertFile.mock.calls[0][0].path).toMatch(/\.svg$/)
  })

  it('rejects malformed image data and propagates upload failures', async () => {
    await expect(publishImageAssets(input('<img src="data:image/png;base64,!!">'))).rejects.toThrow('could not be decoded')
    upsertFile.mockRejectedValueOnce(new Error('Upload failed'))
    await expect(publishImageAssets(input(`<img src="${data}">`))).rejects.toThrow('Upload failed')
  })

  it('opens linked assets with authenticated requests and deduplicates repeated references', async () => {
    fetchRepoFileText.mockResolvedValue({ text: 'AP+AAQ==' })
    const html = await loadPublishedImageAssets(input('<img src="../assets/photo.png" alt="Photo"><img src="../assets/photo.png">'))
    expect(fetchRepoFileText).toHaveBeenCalledExactlyOnceWith({ ...connection, path: 'blog/assets/photo.png', encoding: 'base64' })
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect([...doc.images].map(img => img.getAttribute('src'))).toEqual([data, data])
    expect(doc.images[0].alt).toBe('Photo')
  })

  it('does not fetch external URLs or unrelated relative paths with the GitHub token', async () => {
    const html = '<img src="https://example.com/image.png"><img src="../../other.png">'
    expect(await loadPublishedImageAssets(input(html))).toBe(html)
    expect(fetchRepoFileText).not.toHaveBeenCalled()
  })
})
