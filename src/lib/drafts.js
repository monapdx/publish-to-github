const STORAGE_KEY = 'blog-editor-drafts'
const DATABASE_NAME = 'blog-editor-drafts'
const MIGRATION_KEY = 'localStorage-v1'

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is unavailable. Enable site storage to save drafts.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, 1)
    let blocked = false
    request.onupgradeneeded = () => {
      request.result.createObjectStore('drafts', { keyPath: 'id' })
      request.result.createObjectStore('metadata')
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      blocked = true
      reject(new Error('Close other editor tabs and retry to enable draft storage.'))
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      if (blocked) db.close()
      else resolve(db)
    }
  })
}

// Resolve writes only after the whole transaction commits, not just a request.
function transact(db, stores, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    let result
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => reject(tx.error || new Error('Draft storage transaction was aborted.'))
    tx.onerror = () => {} // The abort event carries the transaction failure.
    try {
      operation(tx, (value) => { result = value })
    } catch (error) {
      tx.abort()
      reject(error)
    }
  })
}

async function migrateLegacyDrafts(db) {
  const migrated = await transact(db, ['metadata'], 'readonly', (tx, done) => {
    const request = tx.objectStore('metadata').get(MIGRATION_KEY)
    request.onsuccess = () => done(request.result)
  })
  if (migrated) return
  const raw = localStorage.getItem(STORAGE_KEY)
  const drafts = raw ? JSON.parse(raw) : []
  if (!Array.isArray(drafts) || drafts.some(d => !d || typeof d.id !== 'string' || !d.id)) {
    throw new Error('Existing draft data could not be migrated. The original data has been kept.')
  }
  // Migration and its marker commit together. A retry never overwrites an edited
  // IndexedDB draft, even if another tab has already completed migration.
  await transact(db, ['drafts', 'metadata'], 'readwrite', (tx) => {
    const metadata = tx.objectStore('metadata')
    const marker = metadata.get(MIGRATION_KEY)
    marker.onsuccess = () => {
      if (marker.result) return
      const store = tx.objectStore('drafts')
      for (const draft of drafts) {
        const existing = store.get(draft.id)
        existing.onsuccess = () => { if (!existing.result) store.put(draft) }
      }
      metadata.put(true, MIGRATION_KEY)
    }
  })
  // A failed cleanup is harmless: the committed marker prevents resurrection.
  try {
    if (localStorage.getItem(STORAGE_KEY) === raw) localStorage.removeItem(STORAGE_KEY)
  } catch { /* Keep the legacy backup if browser settings prevent cleanup. */ }
}

// Preserve invocation order across saves, reads, and deletes while storage opens.
let pending = Promise.resolve()
function withDatabase(operation) {
  const result = pending.then(async () => {
    const db = await openDatabase()
    try {
      await migrateLegacyDrafts(db)
      return await operation(db)
    } finally {
      db.close()
    }
  })
  pending = result.catch(() => {})
  return result
}

export async function saveDraft(post) {
  const row = {
    id: post.id ?? `draft_${globalThis.crypto.randomUUID()}`,
    title: post.title ?? '',
    slug: post.slug ?? '',
    content: post.content ?? '',
    excerpt: post.excerpt ?? '',
    category: post.category ?? '',
    updatedAt: new Date().toISOString(),
  }
  try {
    return await withDatabase(db => transact(db, ['drafts'], 'readwrite', (tx, done) => {
      const store = tx.objectStore('drafts')
      const request = store.get(row.id)
      request.onsuccess = () => {
        const isUpdate = Boolean(request.result)
        store.put(row)
        done({ ok: true, ...row, isUpdate })
      }
    }))
  } catch (error) {
    return {
      ok: false,
      reason: error?.name === 'QuotaExceededError' ? 'quota' : 'unknown',
      message: String(error?.message || error),
    }
  }
}

export function loadDrafts() {
  return withDatabase(db => transact(db, ['drafts'], 'readonly', (tx, done) => {
    const request = tx.objectStore('drafts').getAll()
    request.onsuccess = () => done(request.result.sort((a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
    ))
  }))
}

export function loadDraft(id) {
  return withDatabase(db => transact(db, ['drafts'], 'readonly', (tx, done) => {
    const request = tx.objectStore('drafts').get(id)
    request.onsuccess = () => done(request.result ?? null)
  }))
}

export function deleteDraft(id) {
  return withDatabase(db => transact(db, ['drafts'], 'readwrite', tx => {
    tx.objectStore('drafts').delete(id)
  }))
}
