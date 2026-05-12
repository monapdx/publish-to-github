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

function isQuotaExceededError(e) {
  if (!e) return false
  if (e.name === 'QuotaExceededError') return true
  if (e.code === 22 || e.code === 1014) return true
  return String(e.message || '').toLowerCase().includes('quota')
}

function writeRaw(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    if (isQuotaExceededError(e)) {
      const err = new Error('STORAGE_QUOTA')
      err.cause = e
      throw err
    }
    throw e
  }
}

/**
 * @param {{ id?: string, title: string, slug: string, content: string, excerpt?: string, category?: string }} post
 * @returns
 *   | { ok: true, id: string, title: string, slug: string, content: string, excerpt: string, category: string, updatedAt: string, isUpdate: boolean }
 *   | { ok: false, reason: 'quota' | 'unknown', message?: string }
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
  const nextList = idx >= 0 ? list.map((d, i) => (i === idx ? row : d)) : [row, ...list]
  try {
    writeRaw(nextList)
  } catch (e) {
    if (e instanceof Error && e.message === 'STORAGE_QUOTA') {
      return { ok: false, reason: 'quota' }
    }
    return { ok: false, reason: 'unknown', message: String(e?.message || e) }
  }
  return { ok: true, ...row, isUpdate }
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
