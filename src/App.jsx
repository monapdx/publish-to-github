import { useCallback, useEffect, useRef, useState } from 'react'
import { HeaderBar } from './components/HeaderBar'
import { ToastStack } from './components/ToastStack'
import { BlogEditor } from './components/BlogEditor'
import { HtmlEditor } from './components/HtmlEditor'
import { DraftList } from './components/DraftList'
import { PublishDialog } from './components/PublishDialog'
import { loadGithubSettings, persistGithubSettings } from './lib/githubSettings'
import { saveDraft, loadDrafts, loadDraft, deleteDraft } from './lib/drafts'
import { slugify } from './lib/slugify'
import { serializePost } from './lib/postSerializer'
import { getFileSha, upsertFile } from './lib/github'

const EMPTY_DOC = '<p></p>'

function normalizePostsPath(p) {
  if (!p || typeof p !== 'string') return 'blog/'
  let s = p.trim().replace(/\\/g, '/')
  if (!s.endsWith('/')) s += '/'
  if (!s.startsWith('/')) return s
  return s.replace(/^\/+/, '')
}

function buildFilePath(postsPath, slug) {
  const base = normalizePostsPath(postsPath)
  const clean = String(slug || 'post')
    .trim()
    .replace(/\.html$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base}${clean || 'post'}.html`
}

export default function App() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [content, setContent] = useState(EMPTY_DOC)
  const [excerpt, setExcerpt] = useState('')
  const [mode, setMode] = useState('visual')
  const [draftId, setDraftId] = useState(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [githubSettings, setGithubSettings] = useState(() => loadGithubSettings())
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDialogKey, setPublishDialogKey] = useState(0)
  const [toasts, setToasts] = useState([])
  /** Snapshot of the last persisted draft (manual save, autosave, or open). */
  const lastSavedRef = useRef({
    id: null,
    title: '',
    slug: '',
    content: EMPTY_DOC,
    excerpt: '',
  })

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (message) => {
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
      setToasts((list) => [...list, { id, message }])
      window.setTimeout(() => dismissToast(id), 3800)
    },
    [dismissToast],
  )

  const refreshDrafts = useCallback(() => {
    setDrafts(loadDrafts())
  }, [])

  const onTitleChange = useCallback(
    (value) => {
      setTitle(value)
      if (!slugManual) setSlug(slugify(value))
    },
    [slugManual],
  )

  const onSlugChange = useCallback((value) => {
    setSlugManual(true)
    setSlug(value)
  }, [])

  const persistSnapshot = useCallback((id, fields) => {
    lastSavedRef.current = {
      id,
      title: fields.title,
      slug: fields.slug,
      content: fields.content,
      excerpt: fields.excerpt,
    }
  }, [])

  const handleSaveDraft = useCallback(() => {
    const row = saveDraft({
      id: draftId ?? undefined,
      title,
      slug,
      content,
      excerpt,
    })
    setDraftId(row.id)
    setUpdatedAt(row.updatedAt)
    persistSnapshot(row.id, { title, slug, content, excerpt })
    refreshDrafts()
    pushToast(
      row.isUpdate
        ? 'Changes to this draft saved locally.'
        : 'Draft saved. Your latest version is stored locally.',
    )
  }, [draftId, title, slug, content, excerpt, refreshDrafts, pushToast, persistSnapshot])

  /** Autosave open drafts after idle edits (no toast). */
  useEffect(() => {
    if (!draftId) return undefined
    const snap = lastSavedRef.current
    if (
      snap.id === draftId &&
      snap.title === title &&
      snap.slug === slug &&
      snap.content === content &&
      snap.excerpt === excerpt
    ) {
      return undefined
    }
    const handle = window.setTimeout(() => {
      const row = saveDraft({
        id: draftId,
        title,
        slug,
        content,
        excerpt,
      })
      persistSnapshot(row.id, { title, slug, content, excerpt })
      setUpdatedAt(row.updatedAt)
      refreshDrafts()
    }, 2000)
    return () => window.clearTimeout(handle)
  }, [draftId, title, slug, content, excerpt, refreshDrafts, persistSnapshot])

  useEffect(() => {
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return
      e.preventDefault()
      handleSaveDraft()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSaveDraft])

  const handleOpenDraft = useCallback(
    (id) => {
      const d = loadDraft(id)
      if (!d) return
      setDraftId(d.id)
      setTitle(d.title ?? '')
      setSlug(d.slug ?? '')
      setSlugManual(true)
      const body = d.content && d.content.trim() ? d.content : EMPTY_DOC
      setContent(body)
      setExcerpt(d.excerpt ?? '')
      setUpdatedAt(d.updatedAt ?? '')
      setMode('visual')
      lastSavedRef.current = {
        id: d.id,
        title: d.title ?? '',
        slug: d.slug ?? '',
        content: body,
        excerpt: d.excerpt ?? '',
      }
    },
    [],
  )

  const handleNewDraft = useCallback(() => {
    setDraftId(null)
    setTitle('')
    setSlug('')
    setSlugManual(false)
    setContent(EMPTY_DOC)
    setExcerpt('')
    setUpdatedAt('')
    setMode('visual')
    lastSavedRef.current = {
      id: null,
      title: '',
      slug: '',
      content: EMPTY_DOC,
      excerpt: '',
    }
  }, [])

  const handleDeleteDraft = useCallback(
    (id) => {
      deleteDraft(id)
      if (draftId === id) handleNewDraft()
      refreshDrafts()
    },
    [draftId, handleNewDraft, refreshDrafts],
  )

  const handlePublish = useCallback(
    async (form) => {
      const publishedDraftId = draftId
      const s = slug.trim() || slugify(title) || 'post'
      const path = buildFilePath(form.postsPath, s)
      const html = serializePost({
        title: title.trim() || 'Untitled',
        content,
        templateId: form.templateId,
      })
      const sha = await getFileSha({
        token: form.token.trim(),
        owner: form.owner.trim(),
        repo: form.repo.trim(),
        path,
        branch: form.branch.trim() || 'main',
      })
      await upsertFile({
        token: form.token.trim(),
        owner: form.owner.trim(),
        repo: form.repo.trim(),
        path,
        branch: form.branch.trim() || 'main',
        content: html,
        message: `Publish: ${title.trim() || path}`,
        sha,
      })
      setGithubSettings({ ...form })
      persistGithubSettings({ ...form })
      if (publishedDraftId) {
        deleteDraft(publishedDraftId)
        refreshDrafts()
        handleNewDraft()
      }
      pushToast(`Published to ${path}`)
    },
    [draftId, title, slug, content, pushToast, refreshDrafts, handleNewDraft],
  )

  return (
    <div className="app-shell">
      <HeaderBar
        mode={mode}
        onModeChange={setMode}
        onSaveDraft={handleSaveDraft}
        onPublish={() => {
          setPublishDialogKey((k) => k + 1)
          setPublishOpen(true)
        }}
      />
      <div className="app-body">
        <DraftList
          drafts={drafts}
          currentDraftId={draftId}
          onOpen={handleOpenDraft}
          onDelete={handleDeleteDraft}
          onNew={handleNewDraft}
        />
        <main className="app-main">
          <div className="post-meta">
            <label className="field field--inline">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Post title"
              />
            </label>
            <label className="field field--inline">
              <span>Slug</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="url-slug"
              />
            </label>
            <label className="field field--inline field--excerpt">
              <span>Excerpt</span>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Optional short summary (stored in draft only for now)"
              />
            </label>
            <p className="post-meta__hint">
              {draftId ? (
                <>
                  Draft <code>{draftId}</code>
                  {updatedAt ? ` · Last saved ${new Date(updatedAt).toLocaleString()}` : null}
                </>
              ) : (
                'New draft — not saved yet'
              )}
            </p>
          </div>
          <section className="editor-section" aria-label="Post body">
            {mode === 'visual' ? (
              <BlogEditor
                key={draftId ?? 'new'}
                content={content}
                onChange={setContent}
                onRequestSourceMode={() => setMode('code')}
              />
            ) : (
              <HtmlEditor
                key={draftId ?? 'new'}
                value={content}
                onChange={setContent}
                placeholder="Edit raw HTML…"
              />
            )}
          </section>
        </main>
      </div>
      <PublishDialog
        key={publishDialogKey}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        initialSettings={githubSettings}
        onPublish={handlePublish}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
