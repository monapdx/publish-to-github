// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import App from '../../App'
import { loadDrafts } from '../../lib/drafts'

vi.mock('../BlogEditor', () => ({ BlogEditor: () => <div>Editor</div> }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let host, root
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)) }) }
const click = async text => {
  await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === text).click())
  await settle()
}
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  localStorage.setItem('blog-editor-github-settings', JSON.stringify({ token: 'test', owner: 'owner', repo: 'repo' }))
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('loads migrated drafts, opens, saves, and deletes using async storage', async () => {
  localStorage.setItem('blog-editor-drafts', JSON.stringify([{ id: 'legacy', title: 'Legacy post', content: '<p>Hello</p>' }]))
  await act(async () => root.render(<App />))
  await settle()
  await act(async () => host.querySelector('.draft-item').click())
  await settle()
  expect(host.querySelector('.post-meta input').value).toBe('Legacy post')
  await click('Save draft')
  expect(await loadDrafts()).toHaveLength(1)
  expect(host.textContent).toContain('Changes to this draft saved locally.')
  await act(async () => host.querySelector('.draft-item__delete').click())
  await settle()
  expect(await loadDrafts()).toEqual([])
  expect(host.querySelector('.post-meta input').value).toBe('')
})

it('shows a retryable load error without presenting storage failure as an empty list', async () => {
  vi.stubGlobal('indexedDB', undefined)
  await act(async () => root.render(<App />))
  await settle()
  expect(host.querySelector('[role="alert"]').textContent).toContain('Could not load local drafts')
  expect(host.textContent).not.toContain('No drafts yet.')
  vi.stubGlobal('indexedDB', new IDBFactory())
  await click('Retry')
  expect(host.textContent).toContain('No drafts yet.')
})
