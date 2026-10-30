// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import App from '../../App'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
it('loads a published post whose GitHub response omits inline content', async () => {
  localStorage.setItem('blog-editor-github-settings', JSON.stringify({ token: 'test', owner: 'owner', repo: 'repo', branch: 'main' }))
  const html = '<html><head><meta name="blog-editor:title" content="Selected title"></head><body><article class="blog-post"><h1>Selected title</h1><div class="post-content"><p>Selected published body</p></div></article></body></html>'
  vi.stubGlobal('fetch', vi.fn(async (url, options) => ({ ok: true, status: 200, text: async () => html, json: async () => url.includes('selected.html') ? { sha: 'abc', size: 4544867, content: '', encoding: 'none' } : url.includes('blog/posts?') ? [] : [{ type: 'file', name: 'selected.html', path: 'blog/selected.html' }], headers: options.headers })))
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)) }) }
  try {
    await act(async () => root.render(<App />))
    await settle()
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Published').click())
    await settle()
    await act(async () => host.querySelector('.draft-item').click())
    await settle()
    expect(host.querySelector('.post-meta input').value).toBe('Selected title')
    expect(host.querySelector('.tiptap')?.textContent).toContain('Selected published body')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    localStorage.clear()
    vi.unstubAllGlobals()
  }
})
