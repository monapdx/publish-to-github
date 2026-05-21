import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HeaderBar } from './components/HeaderBar'
import { ToastStack } from './components/ToastStack'
import { HtmlEditor } from './components/HtmlEditor'
import { DraftList } from './components/DraftList'
import { PublishDialog } from './components/PublishDialog'
import { DeletePublishedPostDialog } from './components/DeletePublishedPostDialog'
import { FirstRunSetup } from './components/FirstRunSetup'
import { HelpPage } from './components/HelpPage'
import { BlogIndexEditorDialog } from './components/BlogIndexEditorDialog'
import { loadGithubSettings, persistGithubSettings } from './lib/githubSettings'
import { getFriendlyGithubError } from './lib/githubFriendlyMessages'
import { saveDraft, loadDrafts, loadDraft, deleteDraft } from './lib/drafts'
import { slugify } from './lib/slugify'
import { parsePublishedHtml } from './lib/postSerializer'
import { loadPostTemplate, persistPostTemplate } from './lib/postTemplate'
import { fetchRepoFileText, listPostHtmlFiles } from './lib/github'
import { publishPostAndIndex } from './lib/publishPipeline'
import { deletePublishedPost } from './lib/deletePublishedPost'
import { PublishValidationError } from './lib/publishTemplates'
import { postHref, postRepoPath } from './lib/blogPaths'
import {
  filterVisiblePublishedPosts,
  mergeRepoPublishedWithLocal,
  pruneRecentlyDeletedSlugs,
  withoutDeletedPost,
} from './lib/publishedPosts'
import { PostTemplatePanel } from './components/PostTemplatePanel'

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
  const [updatedAt, setUpdatedAt] = useState('')
  const [githubSettings, setGithubSettings] = useState(() => loadGithubSettings())
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const [listTab, setListTab] = useState('drafts')
  const [publishedFiles, setPublishedFiles] = useState([])
  const [recentlyDeletedSlugs, setRecentlyDeletedSlugs] = useState([])
  const [publishedLoading, setPublishedLoading] = useState(false)
  const [publishedRefreshing, setPublishedRefreshing] = useState(false)
  const publishedRefreshTimeoutRef = useRef(null)
  const [publishedError, setPublishedError] = useState('')
  const [publishedErrorDetail, setPublishedErrorDetail] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [blogIndexOpen, setBlogIndexOpen] = useState(false)
  const [blogIndexDialogKey, setBlogIndexDialogKey] = useState(0)
  const [indexHomeBanner, setIndexHomeBanner] = useState({ show: false, text: '' })
  const [publishedSource, setPublishedSource] = useState(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishDialogKey, setPublishDialogKey] = useState(0)
  const [publishBusy, setPublishBusy] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
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

  const refreshPublishedPostsFromRepo = useCallback(
    async ({ showPanelLoading = true } = {}) => {
      const token = githubSettings.token?.trim()
      const owner = githubSettings.owner?.trim()
      const repo = githubSettings.repo?.trim()
      if (!token || !owner || !repo) {
        setPublishedFiles([])
        setPublishedLoading(false)
        setPublishedError('')
        setPublishedErrorDetail('')
        return []
      }
      if (showPanelLoading) {
        setPublishedLoading(true)
        setPublishedError('')
        setPublishedErrorDetail('')
      }
      try {
        const files = await listPostHtmlFiles({
          token,
          owner,
          repo,
          branch: githubSettings.branch?.trim() || 'main',
        })
        const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))
        setPublishedFiles((current) => mergeRepoPublishedWithLocal(current, sorted))
        setRecentlyDeletedSlugs((prev) => pruneRecentlyDeletedSlugs(prev, sorted))
        return sorted
      } catch (err) {
        const { friendly, technical } = getFriendlyGithubError(err, 'list')
        if (showPanelLoading) {
          setPublishedError(friendly)
          setPublishedErrorDetail(technical)
          setPublishedFiles([])
        }
        throw new Error(friendly)
      } finally {
        if (showPanelLoading) setPublishedLoading(false)
      }
    },
    [githubSettings],
  )

  const loadPublishedList = useCallback(() => {
    return refreshPublishedPostsFromRepo({ showPanelLoading: true })
  }, [refreshPublishedPostsFromRepo])

  const handleRefreshPublished = useCallback(async () => {
    console.log('Refresh published posts clicked')
    setPublishedRefreshing(true)
    setPublishedError('')
    setPublishedErrorDetail('')
    try {
      const posts = await refreshPublishedPostsFromRepo({ showPanelLoading: false })
      console.log('Fetched published posts:', posts)
      pushToast('Published list refreshed')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not refresh the published list.'
      setPublishedError(message)
      pushToast(message)
    } finally {
      setPublishedRefreshing(false)
    }
  }, [refreshPublishedPostsFromRepo, pushToast])

  const visiblePublishedFiles = useMemo(
    () => filterVisiblePublishedPosts(publishedFiles, recentlyDeletedSlugs),
    [publishedFiles, recentlyDeletedSlugs],
  )

  useEffect(() => {
    return () => {
      if (publishedRefreshTimeoutRef.current != null) {
        window.clearTimeout(publishedRefreshTimeoutRef.current)
      }
    }
  }, [])

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
        const { friendly } = getFriendlyGithubError(err, 'fetch')
        pushToast(friendly)
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
      setPublishBusy(true)
      try {
        const publishedDraftId = draftId
        const s = slug.trim() || slugify(title) || 'post'
        const path = postRepoPath(s)
        const currentSlug = s
        const result = await publishPostAndIndex({
          form,
          path,
          slug: currentSlug,
          title,
          content,
          excerpt,
          category,
          categoryClass: 'nb-bg-pink',
        })
        console.log('Publish result:', result)
        setIndexHomeBanner(result.indexHomeBanner)

        const publishedPost = {
          slug: result.slug || currentSlug,
          title: result.title || title,
          excerpt: result.excerpt ?? excerpt,
          category: result.category ?? category,
          path: result.postPath || result.path || postRepoPath(currentSlug),
          url: result.url || postHref(currentSlug),
          publishedAt: result.publishedAt || new Date().toISOString(),
          name: `${result.slug || currentSlug}.html`,
          sha: null,
        }
        console.log('Optimistic published post:', publishedPost)
        console.log('Updating publishedPosts after publish')

        setPublishedFiles((posts) => {
          const withoutExisting = posts.filter(
            (post) => post.slug !== publishedPost.slug && post.path !== publishedPost.path,
          )
          return [publishedPost, ...withoutExisting]
        })
        setRecentlyDeletedSlugs((prev) => prev.filter((deleted) => deleted !== publishedPost.slug))
        setListTab('published')

        if (result.workflowWarning) pushToast(result.workflowWarning)

        setGithubSettings({ ...form })
        if (!persistGithubSettings({ ...form })) {
          pushToast(
            'Posted to GitHub, but connection settings could not be saved in this browser (storage may be full or disabled).',
          )
        }
        if (publishedDraftId) {
          deleteDraft(publishedDraftId)
          refreshDrafts()
          handleNewDraft()
        }
        pushToast('Published post. GitHub Pages may take a minute to redeploy.')

        if (publishedRefreshTimeoutRef.current != null) {
          window.clearTimeout(publishedRefreshTimeoutRef.current)
        }
        publishedRefreshTimeoutRef.current = window.setTimeout(() => {
          publishedRefreshTimeoutRef.current = null
          refreshPublishedPostsFromRepo({ showPanelLoading: false }).catch(() => {})
        }, 5000)
      } finally {
        setPublishBusy(false)
      }
    },
    [
      draftId,
      title,
      slug,
      content,
      excerpt,
      category,
      pushToast,
      refreshDrafts,
      handleNewDraft,
      refreshPublishedPostsFromRepo,
    ],
  )

  const deleteSlug = slug.trim() || slugify(title) || ''
  const canDeletePublished =
    Boolean(deleteSlug) && githubReady && !publishBusy && !deleteBusy

  const handleConfirmDeletePublished = useCallback(async () => {
    if (!canDeletePublished) return
    const deletedPath = postRepoPath(deleteSlug)
    const deletedHref = postHref(deleteSlug)
    const hadOpenPublished = publishedSource?.path === deletedPath
    setDeleteBusy(true)
    try {
      const result = await deletePublishedPost({
        form: githubSettings,
        slug: deleteSlug,
      })

      if (!result.postDeleted) {
        pushToast(result.successMessage)
        setDeleteConfirmOpen(false)
        return
      }

      setRecentlyDeletedSlugs((prev) =>
        prev.includes(deleteSlug) ? prev : [...prev, deleteSlug],
      )
      setPublishedFiles((files) =>
        withoutDeletedPost(files, { slug: deleteSlug, path: deletedPath, href: deletedHref }),
      )

      if (hadOpenPublished) {
        setPublishedSource(null)
        handleNewDraft()
      }

      pushToast('Deleted published post. GitHub Pages may take a minute to redeploy.')
      if (!result.indexUpdated) {
        pushToast(result.successMessage)
      }
      setDeleteConfirmOpen(false)

      if (publishedRefreshTimeoutRef.current != null) {
        window.clearTimeout(publishedRefreshTimeoutRef.current)
      }
      publishedRefreshTimeoutRef.current = window.setTimeout(() => {
        publishedRefreshTimeoutRef.current = null
        refreshPublishedPostsFromRepo({ showPanelLoading: false }).catch(() => {})
      }, 5000)
    } catch (err) {
      if (err instanceof PublishValidationError) {
        pushToast(err.message)
      } else {
        const { friendly } = getFriendlyGithubError(err, 'publish')
        pushToast(friendly)
      }
    } finally {
      setDeleteBusy(false)
    }
  }, [
    canDeletePublished,
    githubSettings,
    deleteSlug,
    pushToast,
    publishedSource,
    refreshPublishedPostsFromRepo,
    handleNewDraft,
  ])

  const openPublishDialog = useCallback(() => {
    setPublishDialogKey((k) => k + 1)
    setPublishOpen(true)
  }, [])

  const openBlogIndexEditor = useCallback(() => {
    setBlogIndexDialogKey((k) => k + 1)
    setBlogIndexOpen(true)
  }, [])

  const handleSaveGithubSettings = useCallback(
    (form) => {
      if (!persistGithubSettings({ ...form })) {
        pushToast(
          'Could not save connection settings in this browser (storage may be full or disabled). Nothing was changed.',
        )
        return
      }
      setGithubSettings({ ...form })
      pushToast('Connection settings saved in this browser. Change them anytime from Publish.')
    },
    [pushToast],
  )

  return (
    <div className="app-shell">
      {!githubReady ? (
        <FirstRunSetup
          initialSettings={githubSettings}
          onSave={handleSaveGithubSettings}
          onOpenHelp={() => setHelpOpen(true)}
        />
      ) : (
        <>
          <HeaderBar
            mode={mode}
            onModeChange={setMode}
            onSaveDraft={handleSaveDraft}
            onPublish={openPublishDialog}
            onOpenHelp={() => setHelpOpen(true)}
          />
          {indexHomeBanner.show ? (
            <div className="app-banner" role="status">
              <p>{indexHomeBanner.text}</p>
              <div className="app-banner__actions">
                <button type="button" className="btn btn--small btn--primary" onClick={openBlogIndexEditor}>
                  Edit homepage (index.html)
                </button>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => setIndexHomeBanner({ show: false, text: '' })}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
          <div className="app-body">
            <DraftList
              listTab={listTab}
              onListTabChange={setListTab}
              drafts={drafts}
              currentDraftId={draftId}
              onOpenDraft={handleOpenDraft}
              onDeleteDraft={handleDeleteDraft}
              onNew={handleNewDraft}
              publishedFiles={visiblePublishedFiles}
              publishedLoading={publishedLoading}
              publishedRefreshing={publishedRefreshing}
              publishedError={publishedError}
              publishedErrorDetail={publishedErrorDetail}
              currentPublishedPath={publishedSource?.path ?? null}
              onOpenPublished={handleOpenPublished}
              onRefreshPublished={() => void handleRefreshPublished()}
              githubReady={githubReady}
              onOpenPublishSettings={openPublishDialog}
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
                    placeholder="Short name for the file URL (e.g. my-first-post)"
                  />
                </label>
                <label className="field field--inline field--excerpt">
                  <span>Excerpt</span>
                  <input
                    type="text"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Optional short blurb (shown in listings if your site uses it)"
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
              {publishedSource ? (
                <>
                  Published file <code>{publishedSource.path}</code> — use <strong>Save draft</strong> to keep a copy on
                  this computer.
                </>
              ) : draftId ? (
                <>
                  Draft <code>{draftId}</code>
                  {updatedAt ? ` · Last saved ${new Date(updatedAt).toLocaleString()}` : null}
                </>
              ) : (
                'New draft — nothing saved on this computer yet. Use Save draft when you want a backup.'
              )}
            </p>
            <div className="post-meta__actions">
              <button
                type="button"
                className="btn btn--danger btn--small"
                disabled={!canDeletePublished}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete Published Post
              </button>
            </div>
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
              onEditBlogIndex={openBlogIndexEditor}
              githubSettings={githubSettings}
            />
          ) : null}
            </main>
          </div>
        </>
      )}
      <PublishDialog
        key={publishDialogKey}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        initialSettings={githubSettings}
        onPublish={handlePublish}
        onSaveSettings={handleSaveGithubSettings}
      />
      <DeletePublishedPostDialog
        open={deleteConfirmOpen}
        slug={deleteSlug || 'post'}
        busy={deleteBusy}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleConfirmDeletePublished()}
      />
      <HelpPage open={helpOpen} onClose={() => setHelpOpen(false)} />
      {blogIndexOpen ? (
        <BlogIndexEditorDialog
          key={blogIndexDialogKey}
          settings={githubSettings}
          onClose={() => setBlogIndexOpen(false)}
          onSaved={() => {
            pushToast('Homepage file (index.html) saved on GitHub.')
            setIndexHomeBanner({ show: false, text: '' })
            loadPublishedList().catch(() => {})
          }}
        />
      ) : null}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
