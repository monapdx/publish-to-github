const STORAGE_KEY = 'blog-editor-drafts'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/**
 * @param {{ id?: string, title: string, slug: string, content: string, excerpt?: string, category?: string }} post
 * @returns {{ id: string, title: string, slug: string, content: string, excerpt: string, category: string, updatedAt: string, isUpdate: boolean }}
 */
export function saveDraft(post) {
  const list = readRaw()
  const now = new Date().toISOString()
  const id = post.id ?? `draft_${Date.now()}`
  const idx = list.findIndex((d) => d.id === id)
  const isUpdate = idx >= 0
  const row = {
    id,
    title: post.title ?? '',
    slug: post.slug ?? '',
    content: post.content ?? '',
    excerpt: post.excerpt ?? '',
    category: post.category ?? '',
    updatedAt: now,
  }
  if (idx >= 0) list[idx] = row
  else list.unshift(row)
  writeRaw(list)
  return { ...row, isUpdate }
}

export function loadDrafts() {
  return readRaw().sort((a, b) => {
    const ta = new Date(a.updatedAt || 0).getTime()
    const tb = new Date(b.updatedAt || 0).getTime()
    return tb - ta
  })
}

export function loadDraft(id) {
  return readRaw().find((d) => d.id === id) ?? null
}

export function deleteDraft(id) {
  const list = readRaw().filter((d) => d.id !== id)
  writeRaw(list)
}
