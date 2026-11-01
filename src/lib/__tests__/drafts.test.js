import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, expect, it, vi } from 'vitest'
import { deleteDraft, loadDraft, loadDrafts, saveDraft } from '../drafts'

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  localStorage.clear()
})

it('migrates all legacy fields and preserves draft IDs, timestamps, and order', async () => {
  const rows = [
    { id: 'old', title: 'Old', content: '<p>old</p>', updatedAt: '2020-01-01' },
    { id: 'new', title: 'New', slug: 'slug', content: '<p>image</p>', excerpt: 'excerpt', category: 'cat', updatedAt: '2021-01-01' },
  ]
  localStorage.setItem('blog-editor-drafts', JSON.stringify(rows))
  expect(await loadDrafts()).toEqual([rows[1], rows[0]])
  expect(localStorage.getItem('blog-editor-drafts')).toBeNull()
  expect(await loadDraft('new')).toEqual(rows[1])
})

it('does not resurrect migrated drafts if an old backup remains', async () => {
  const raw = JSON.stringify([{ id: 'old', content: 'legacy' }])
  localStorage.setItem('blog-editor-drafts', raw)
  await loadDrafts()
  localStorage.setItem('blog-editor-drafts', raw)
  await deleteDraft('old')
  expect(await loadDrafts()).toEqual([])
})

it('keeps malformed legacy data and retries after it is repaired', async () => {
  localStorage.setItem('blog-editor-drafts', '{broken')
  await expect(loadDrafts()).rejects.toThrow()
  expect(localStorage.getItem('blog-editor-drafts')).toBe('{broken')
  localStorage.setItem('blog-editor-drafts', JSON.stringify([{ id: 'fixed', content: 'recovered' }]))
  expect((await loadDraft('fixed')).content).toBe('recovered')
})

it('saves a large post independently and updates without duplicates', async () => {
  const content = '<img src="data:image/png;base64,' + 'a'.repeat(8 * 1024 * 1024) + '">'
  const first = await saveDraft({ title: 'Large', content })
  expect(first).toMatchObject({ ok: true, isUpdate: false })
  await saveDraft({ title: 'Other', content: 'keep' })
  expect(await saveDraft({ ...first, title: 'Edited' })).toMatchObject({ ok: true, isUpdate: true })
  expect((await loadDraft(first.id)).content).toBe(content)
  expect(await loadDrafts()).toHaveLength(2)
  expect(localStorage.getItem('blog-editor-drafts')).toBeNull()
})

it('preserves invocation order for overlapping save, update, delete, and read', async () => {
  const initial = saveDraft({ id: 'same', content: 'first' })
  const update = saveDraft({ id: 'same', content: 'last' })
  const remove = deleteDraft('same')
  const read = loadDraft('same')
  await Promise.all([initial, update, remove])
  expect(await read).toBeNull()
})

it('reports unavailable storage without claiming a successful save', async () => {
  vi.stubGlobal('indexedDB', undefined)
  localStorage.setItem('blog-editor-drafts', JSON.stringify([{ id: 'safe' }]))
  expect(await saveDraft({ content: 'unsaved' })).toMatchObject({ ok: false, reason: 'unknown' })
  expect(localStorage.getItem('blog-editor-drafts')).toContain('safe')
  await expect(deleteDraft('safe')).rejects.toThrow()
})
