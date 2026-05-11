import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { HeaderBar } from './components/HeaderBar'
import { ToastStack } from './components/ToastStack'
import { HtmlEditor } from './components/HtmlEditor'
import { DraftList } from './components/DraftList'
import { PublishDialog } from './components/PublishDialog'
import { loadGithubSettings, persistGithubSettings } from './lib/githubSettings'
import { saveDraft, loadDrafts, loadDraft, deleteDraft } from './lib/drafts'
import { slugify } from './lib/slugify'
import { parsePublishedHtml, serializePost } from './lib/postSerializer'
import { loadPostTemplate, persistPostTemplate } from './lib/postTemplate'
import { defaultIndexHtml, getIndexPath, updateIndexHtml } from './lib/blogIndex'
import { fetchRepoFileText, getFileSha, listPostHtmlFiles, upsertFile } from './lib/github'
import { PostTemplatePanel } from './components/PostTemplatePanel'

const EMPTY_DOC = '<p></p>'
const BlogEditor = lazy(() =>
  import('./components/BlogEditor').then((module) => ({ default: module.BlogEditor })),
)

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
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState('visual')
  const [draftId, setDraftId] = useState(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [githubSettings, setGithubSettings] = useState(() => loadGithubSettings())
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const [listTab, setListTab] = useState('drafts')
  const [publishedFiles, setPublishedFiles] = useState([])
  const [publishedLoading, setPublishedLoading] = useState(false)
  const [publishedError, setPublishedError] = useState('')
  const [publishedSource, setPublishedSource] = useState(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDialogKey, setPublishDialogKey] = useState(0)
  const [toasts, setToasts] = useState([])
  const [postTemplateHtml, setPostTemplateHtml] = useState(() => loadPostTemplate())
  /** Snapshot of the last persisted draft (manual save, autosave, or open). */
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

  const githubReady = Boolean(
    githubSettings.token?.trim() && githubSettings.owner?.trim() && githubSettings.repo?.trim(),
  )

  const loadPublishedList = useCallback(async () => {
    const token = githubSettings.token?.trim()
    const owner = githubSettings.owner?.trim()
    const repo = githubSettings.repo?.trim()
    if (!token || !owner || !repo) {
      setPublishedFiles([])
      setPublishedLoading(false)
      setPublishedError('')
      return
    }
    setPublishedLoading(true)
    setPublishedError('')
    try {
      const files = await listPostHtmlFiles({
        token,
        owner,
        repo,
        branch: githubSettings.branch?.trim() || 'main',
        postsPath: githubSettings.postsPath,
      })
      setPublishedFiles([...files].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      setPublishedError(err?.message || 'Could not load published posts')
      setPublishedFiles([])
    } finally {
      setPublishedLoading(false)
    }
  }, [githubSettings])

  useEffect(() => {
    const handle = window.setTimeout(() => persistPostTemplate(postTemplateHtml), 450)
    return () => window.clearTimeout(handle)
  }, [postTemplateHtml])

  useEffect(() => {
    if (listTab !== 'published') return undefined
    const t = window.setTimeout(() => {
      loadPublishedList()
    }, 0)
    return () => window.clearTimeout(t)
  }, [listTab, loadPublishedList])

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

  const handleSaveDraft = useCallback(() => {
    setPublishedSource(null)
    const row = saveDraft({
      id: draftId ?? undefined,
      title,
      slug,
      content,
      excerpt,
      category,
    })
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

  /** Autosave open drafts after idle edits (no toast). */
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
      persistSnapshot(row.id, { title, slug, content, excerpt, category })
      setUpdatedAt(row.updatedAt)
      refreshDrafts()
    }, 2000)
    return () => window.clearTimeout(handle)
  }, [draftId, title, slug, content, excerpt, category, refreshDrafts, persistSnapshot])

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
      setPublishedSource(null)
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

  const handleNewDraft = useCallback(() => {
    setPublishedSource(null)
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

  const handleOpenPublished = useCallback(
    async (path) => {
      const token = githubSettings.token?.trim()
      const owner = githubSettings.owner?.trim()
      const repo = githubSettings.repo?.trim()
      const branch = githubSettings.branch?.trim() || 'main'
      if (!token || !owner || !repo) return
      try {
        const { text } = await fetchRepoFileText({ token, owner, repo, path, branch })
        const {
          title: parsedTitle,
          excerpt: parsedExcerpt,
          content: parsedContent,
          category: parsedCategory,
        } = parsePublishedHtml(text)
        const basename = path.split('/').pop() || 'post'
        const slugFromFile = basename.replace(/\.html$/i, '') || 'post'
        const body =
          parsedContent && parsedContent.trim() ? parsedContent : EMPTY_DOC
        setPublishedSource({ path })
        setDraftId(null)
        setSlugManual(true)
        setTitle(parsedTitle)
        setSlug(slugFromFile)
        setContent(body)
        setExcerpt(parsedExcerpt ?? '')
        setCategory(parsedCategory ?? '')
        setUpdatedAt('')
        setMode('visual')
        lastSavedRef.current = {
          id: null,
          title: parsedTitle,
          slug: slugFromFile,
          content: body,
          excerpt: parsedExcerpt ?? '',
          category: parsedCategory ?? '',
        }
      } catch (err) {
        pushToast(err?.message || 'Failed to load file from GitHub')
      }
    },
    [githubSettings, pushToast],
  )

  const handleDeleteDraft = useCallback(
    (id) => {
      deleteDraft(id)
      if (draftId === id) handleNewDraft()
      refreshDrafts()
    },
    [draftId, handleNewDraft, refreshDrafts],
  )

  const editorDocumentKey = draftId ?? publishedSource?.path ?? 'new'

  const handlePublish = useCallback(
    async (form) => {
      const publishedDraftId = draftId
      const s = slug.trim() || slugify(title) || 'post'
      const path = buildFilePath(form.postsPath, s)
      const html = serializePost({
        title: title.trim() || 'Untitled',
        content,
        excerpt: excerpt.trim(),
        category: category.trim(),
        slug: s,
        date: new Date().toISOString(),
        templateHtml: postTemplateHtml,
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

      // Keep /blog/index.html up to date (safe marker-based insert).
      try {
        const indexPath = getIndexPath(form.postsPath)
        let indexText = ''
        let indexSha = null
        try {
          const res = await fetchRepoFileText({
            token: form.token.trim(),
            owner: form.owner.trim(),
            repo: form.repo.trim(),
            path: indexPath,
            branch: form.branch.trim() || 'main',
          })
          indexText = res.text
          indexSha = res.sha
        } catch (err) {
          // If missing, create a minimal index file.
          if (String(err?.message || '').includes('404')) {
            indexText = defaultIndexHtml()
            indexSha = null
          } else {
            throw err
          }
        }

        const fileName = path.split('/').pop() || `${s}.html`
        const nextIndex = updateIndexHtml({
          indexHtml: indexText,
          fileName,
          title: title.trim() || 'Untitled',
          excerpt: excerpt.trim(),
          category: category.trim(),
          date: new Date().toISOString(),
        })

        await upsertFile({
          token: form.token.trim(),
          owner: form.owner.trim(),
          repo: form.repo.trim(),
          path: indexPath,
          branch: form.branch.trim() || 'main',
          content: nextIndex,
          message: `Index: add ${fileName}`,
          sha: indexSha,
        })
      } catch (err) {
        pushToast(err?.message || 'Published post but could not update blog index.html')
      }

      setGithubSettings({ ...form })
      persistGithubSettings({ ...form })
      if (publishedDraftId) {
        deleteDraft(publishedDraftId)
        refreshDrafts()
        handleNewDraft()
      }
      pushToast(`Published to ${path}`)
      loadPublishedList().catch(() => {})
    },
    [
      draftId,
      title,
      slug,
      content,
      excerpt,
      category,
      postTemplateHtml,
      pushToast,
      refreshDrafts,
      handleNewDraft,
      loadPublishedList,
    ],
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
          listTab={listTab}
          onListTabChange={setListTab}
          drafts={drafts}
          currentDraftId={draftId}
          onOpenDraft={handleOpenDraft}
          onDeleteDraft={handleDeleteDraft}
          onNew={handleNewDraft}
          publishedFiles={publishedFiles}
          publishedLoading={publishedLoading}
          publishedError={publishedError}
          currentPublishedPath={publishedSource?.path ?? null}
          onOpenPublished={handleOpenPublished}
          onRefreshPublished={loadPublishedList}
          githubReady={githubReady}
          onOpenPublishSettings={() => {
            setPublishDialogKey((k) => k + 1)
            setPublishOpen(true)
          }}
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
                placeholder="Optional short summary (saved in drafts and in published HTML meta)"
              />
            </label>
            <label className="field field--inline">
              <span>Category</span>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Optional label shown on the blog index card (e.g. Vibe Coding)"
              />
            </label>
            <p className="post-meta__hint">
              {publishedSource ? (
                <>
                  Published file <code>{publishedSource.path}</code> — use Save draft to keep a
                  local copy.
                </>
              ) : draftId ? (
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
          {mode === 'code' ? (
            <PostTemplatePanel
              html={postTemplateHtml}
              onHtmlChange={setPostTemplateHtml}
              previewContext={{ title, slug, excerpt, category, content }}
              onPreviewBlocked={() =>
                pushToast('Allow pop-ups in your browser to preview the template output.')
              }
              onTemplateSaved={(message) => pushToast(message)}
            />
          ) : null}
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
