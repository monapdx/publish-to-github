import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { HeaderBar } from './components/HeaderBar'
import { ToastStack } from './components/ToastStack'
import { HtmlEditor } from './components/HtmlEditor'
import { DraftList } from './components/DraftList'
import { HelpPage } from './components/HelpPage'
import { saveDraft, loadDrafts, loadDraft, deleteDraft } from './lib/drafts'
import { saveFinal, loadFinals, loadFinal, deleteFinal } from './lib/finals'
import { slugify } from './lib/slugify'
import {
  buildMarkdownDocument,
  downloadTextFile,
  markdownFilename,
} from './lib/markdownExport'

const EMPTY_DOC = '<p></p>'
const BlogEditor = lazy(() =>
  import('./components/BlogEditor').then((module) => ({ default: module.BlogEditor })),
)

function truncatePreview(s, max = 48) {
  const t = String(s || '').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function formatMetaExtrasPreview(slug, excerpt, category) {
  const s = truncatePreview(slug, 28)
  const e = truncatePreview(excerpt, 36)
  const c = truncatePreview(category, 20)
  const parts = []
  if (s) parts.push(`Slug: ${s}`)
  if (e) parts.push(`Excerpt: ${e}`)
  if (c) parts.push(`Category: ${c}`)
  return parts.length ? parts.join(' · ') : 'Not set — expand to edit'
}

export default function App() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [content, setContent] = useState(EMPTY_DOC)
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState('visual')
  const [draftId, setDraftId] = useState(null)
  const [finalId, setFinalId] = useState(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const [finals, setFinals] = useState(() => loadFinals())
  const [listTab, setListTab] = useState('drafts')
  const [helpOpen, setHelpOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const lastSavedRef = useRef({
    id: null,
    title: '',
    slug: '',
    content: EMPTY_DOC,
    excerpt: '',
    category: '',
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

  const refreshFinals = useCallback(() => {
    setFinals(loadFinals())
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
      category: fields.category,
    }
  }, [])

  const resetEditorState = useCallback(() => {
    setFinalId(null)
    setDraftId(null)
    setTitle('')
    setSlug('')
    setSlugManual(false)
    setContent(EMPTY_DOC)
    setExcerpt('')
    setCategory('')
    setUpdatedAt('')
    setMode('visual')
    lastSavedRef.current = {
      id: null,
      title: '',
      slug: '',
      content: EMPTY_DOC,
      excerpt: '',
      category: '',
    }
  }, [])

  const handleSaveDraft = useCallback(() => {
    setFinalId(null)
    const row = saveDraft({
      id: draftId ?? undefined,
      title,
      slug,
      content,
      excerpt,
      category,
    })
    if (!row.ok) {
      pushToast(
        row.reason === 'quota'
          ? 'Could not save: this browser’s storage is full. Free some space or shorten the post.'
          : 'Could not save the draft locally. Check that storage is enabled for this site.',
      )
      return
    }
    setDraftId(row.id)
    setUpdatedAt(row.updatedAt)
    persistSnapshot(row.id, { title, slug, content, excerpt, category })
    refreshDrafts()
    pushToast(
      row.isUpdate
        ? 'Changes to this draft saved locally.'
        : 'Draft saved. Your latest version is stored locally.',
    )
  }, [draftId, title, slug, content, excerpt, category, refreshDrafts, pushToast, persistSnapshot])

  useEffect(() => {
    if (!draftId) return undefined
    const snap = lastSavedRef.current
    if (
      snap.id === draftId &&
      snap.title === title &&
      snap.slug === slug &&
      snap.content === content &&
      snap.excerpt === excerpt &&
      snap.category === category
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
        category,
      })
      if (!row.ok) {
        if (row.reason === 'quota') {
          pushToast('Autosave skipped: browser storage is full.')
        }
        return
      }
      persistSnapshot(row.id, { title, slug, content, excerpt, category })
      setUpdatedAt(row.updatedAt)
      refreshDrafts()
    }, 2000)
    return () => window.clearTimeout(handle)
  }, [draftId, title, slug, content, excerpt, category, refreshDrafts, persistSnapshot, pushToast])

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
      setFinalId(null)
      setDraftId(d.id)
      setTitle(d.title ?? '')
      setSlug(d.slug ?? '')
      setSlugManual(true)
      const body = d.content && d.content.trim() ? d.content : EMPTY_DOC
      setContent(body)
      setExcerpt(d.excerpt ?? '')
      setCategory(d.category ?? '')
      setUpdatedAt(d.updatedAt ?? '')
      setMode('visual')
      lastSavedRef.current = {
        id: d.id,
        title: d.title ?? '',
        slug: d.slug ?? '',
        content: body,
        excerpt: d.excerpt ?? '',
        category: d.category ?? '',
      }
    },
    [],
  )

  const handleOpenFinal = useCallback((id) => {
    const row = loadFinal(id)
    if (!row) return
    setDraftId(null)
    setFinalId(row.id)
    setTitle(row.title ?? '')
    setSlug(row.slug ?? '')
    setSlugManual(true)
    const body = row.content && row.content.trim() ? row.content : EMPTY_DOC
    setContent(body)
    setExcerpt(row.excerpt ?? '')
    setCategory(row.category ?? '')
    setUpdatedAt(row.finalizedAt ?? row.updatedAt ?? '')
    setMode('visual')
    lastSavedRef.current = {
      id: null,
      title: row.title ?? '',
      slug: row.slug ?? '',
      content: body,
      excerpt: row.excerpt ?? '',
      category: row.category ?? '',
    }
  }, [])

  const handleNewDraft = useCallback(() => {
    resetEditorState()
  }, [resetEditorState])

  const handleDeleteDraft = useCallback(
    (id) => {
      deleteDraft(id)
      if (draftId === id) resetEditorState()
      refreshDrafts()
    },
    [draftId, resetEditorState, refreshDrafts],
  )

  const handleDeleteFinal = useCallback(
    (id) => {
      deleteFinal(id)
      if (finalId === id) resetEditorState()
      refreshFinals()
    },
    [finalId, resetEditorState, refreshFinals],
  )

  const editorDocumentKey = draftId ?? finalId ?? 'new'

  const exportMarkdown = useCallback(
    (status) => {
      const resolvedSlug = slug.trim() || slugify(title) || 'untitled'
      const markdown = buildMarkdownDocument({
        title,
        slug: resolvedSlug,
        excerpt,
        category,
        content,
        status,
        updatedAt: updatedAt || new Date().toISOString(),
      })
      downloadTextFile(markdownFilename({ slug: resolvedSlug, status }), markdown)
      return resolvedSlug
    },
    [title, slug, excerpt, category, content, updatedAt],
  )

  const handleExportDraft = useCallback(() => {
    exportMarkdown('draft')
    pushToast('Draft exported as Markdown.')
  }, [exportMarkdown, pushToast])

  const handleExportFinal = useCallback(() => {
    const resolvedSlug = exportMarkdown('final')
    const row = saveFinal({
      id: finalId ?? undefined,
      title,
      slug: resolvedSlug,
      content,
      excerpt,
      category,
    })
    if (!row.ok) {
      pushToast(
        row.reason === 'quota'
          ? 'Markdown downloaded, but the final version could not be saved locally (storage full).'
          : 'Markdown downloaded, but the final version could not be saved locally.',
      )
      return
    }
    setFinalId(row.id)
    setDraftId(null)
    setUpdatedAt(row.finalizedAt)
    refreshFinals()
    setListTab('finals')
    pushToast(
      row.isUpdate
        ? 'Final Markdown exported and your local final copy was updated.'
        : 'Final Markdown exported and saved under Finals.',
    )
  }, [exportMarkdown, finalId, title, content, excerpt, category, refreshFinals, pushToast])

  return (
    <div className="app-shell">
      <HeaderBar
        mode={mode}
        onModeChange={setMode}
        onSaveDraft={handleSaveDraft}
        onExportDraft={handleExportDraft}
        onExportFinal={handleExportFinal}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <div className="app-body">
        <DraftList
          listTab={listTab}
          onListTabChange={setListTab}
          drafts={drafts}
          finals={finals}
          currentDraftId={draftId}
          currentFinalId={finalId}
          onOpenDraft={handleOpenDraft}
          onOpenFinal={handleOpenFinal}
          onDeleteDraft={handleDeleteDraft}
          onDeleteFinal={handleDeleteFinal}
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
                placeholder="e.g. My first weekend post"
              />
            </label>
            <details className="post-meta__collapsible">
              <summary className="post-meta__collapsible-summary">
                <span className="post-meta__collapsible-title">Slug, excerpt &amp; category</span>
                <span className="post-meta__collapsible-preview">{formatMetaExtrasPreview(slug, excerpt, category)}</span>
              </summary>
              <div className="post-meta__collapsible-body">
                <label className="field field--inline">
                  <span>Slug</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    placeholder="Short name for the file (e.g. my-first-post)"
                  />
                </label>
                <label className="field field--inline field--excerpt">
                  <span>Excerpt</span>
                  <input
                    type="text"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Optional short blurb for listings or frontmatter"
                  />
                </label>
                <label className="field field--inline">
                  <span>Category</span>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Optional topic label (e.g. Travel)"
                  />
                </label>
              </div>
            </details>
            <p className="post-meta__hint post-meta__hint--soft">
              {finalId ? (
                <>
                  Final version <code>{finalId}</code>
                  {updatedAt ? ` · Exported ${new Date(updatedAt).toLocaleString()}` : null}
                </>
              ) : draftId ? (
                <>
                  Draft <code>{draftId}</code>
                  {updatedAt ? ` · Last saved ${new Date(updatedAt).toLocaleString()}` : null}
                </>
              ) : (
                'New post — nothing saved on this computer yet. Use Save draft when you want a backup.'
              )}
            </p>
          </div>
          <section className="editor-section" aria-label="Post body">
            {mode === 'visual' ? (
              <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
                <BlogEditor
                  key={editorDocumentKey}
                  documentKey={editorDocumentKey}
                  content={content}
                  onChange={setContent}
                  onRequestSourceMode={() => setMode('code')}
                />
              </Suspense>
            ) : (
              <HtmlEditor
                key={editorDocumentKey}
                value={content}
                onChange={setContent}
                placeholder="Edit raw HTML…"
              />
            )}
          </section>
        </main>
      </div>
      <HelpPage open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
