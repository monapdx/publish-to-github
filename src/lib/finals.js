const STORAGE_KEY = 'blog-editor-finals'

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
 */
export function saveFinal(post) {
  const list = readRaw()
  const now = new Date().toISOString()
  const slug = post.slug?.trim() || 'untitled'
  const existing = list.find((row) => row.slug === slug)
  const id = existing?.id ?? post.id ?? `final_${Date.now()}`
  const isUpdate = Boolean(existing)
  const row = {
    id,
    title: post.title ?? '',
    slug,
    content: post.content ?? '',
    excerpt: post.excerpt ?? '',
    category: post.category ?? '',
    finalizedAt: now,
    updatedAt: now,
  }
  const nextList = isUpdate
    ? list.map((item) => (item.slug === slug ? row : item))
    : [row, ...list]
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

export function loadFinals() {
  return readRaw().sort((a, b) => {
    const ta = new Date(a.finalizedAt || a.updatedAt || 0).getTime()
    const tb = new Date(b.finalizedAt || b.updatedAt || 0).getTime()
    return tb - ta
  })
}

export function loadFinal(id) {
  return readRaw().find((row) => row.id === id) ?? null
}

export function deleteFinal(id) {
  const list = readRaw().filter((row) => row.id !== id)
  writeRaw(list)
}
