export function DraftList({
  listTab,
  onListTabChange,
  drafts,
  currentDraftId,
  onOpenDraft,
  onDeleteDraft,
  onNew,
  publishedFiles,
  publishedLoading,
  publishedError,
  currentPublishedPath,
  onOpenPublished,
  onRefreshPublished,
  githubReady,
  onOpenPublishSettings,
}) {
  const isDrafts = listTab === 'drafts'

  return (
    <aside className="draft-list" aria-label="Posts sidebar">
      <div className="draft-list__tabs" role="tablist" aria-label="List source">
        <button
          type="button"
          role="tab"
          aria-selected={isDrafts}
          className={`draft-list__tab ${isDrafts ? 'is-active' : ''}`}
          onClick={() => onListTabChange('drafts')}
        >
          Drafts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isDrafts}
          className={`draft-list__tab ${!isDrafts ? 'is-active' : ''}`}
          onClick={() => onListTabChange('published')}
        >
          Published
        </button>
      </div>

      {isDrafts ? (
        <>
          <div className="draft-list__header">
            <h2>Local drafts</h2>
            <button type="button" className="btn btn--small btn--ghost btn--sky" onClick={onNew}>
              New
            </button>
          </div>
          {drafts.length === 0 ? (
            <p className="draft-list__empty">No drafts yet. Save one from the header.</p>
          ) : (
            <ul className="draft-list__items">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`draft-item ${d.id === currentDraftId ? 'is-active' : ''}`}
                    onClick={() => onOpenDraft(d.id)}
                  >
                    <span className="draft-item__title">{d.title || '(Untitled)'}</span>
                    <span className="draft-item__meta">{formatDate(d.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    className="draft-item__delete"
                    aria-label={`Delete draft ${d.title || d.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDraft(d.id)
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="draft-list__header">
            <h2>On GitHub</h2>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={onRefreshPublished}
              disabled={!githubReady || publishedLoading}
            >
              Refresh
            </button>
          </div>
          {!githubReady ? (
            <p className="draft-list__empty">
              Add your repository and token in{' '}
              <button type="button" className="draft-list__link" onClick={onOpenPublishSettings}>
                Publish
              </button>{' '}
              to load published HTML files from your posts folder.
            </p>
          ) : publishedLoading ? (
            <p className="draft-list__empty">Loading published posts…</p>
          ) : publishedError ? (
            <p className="draft-list__empty draft-list__error">{publishedError}</p>
          ) : publishedFiles.length === 0 ? (
            <p className="draft-list__empty">No HTML files in your posts folder yet.</p>
          ) : (
            <ul className="draft-list__items draft-list__items--published">
              {publishedFiles.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    className={`draft-item ${f.path === currentPublishedPath ? 'is-active' : ''}`}
                    onClick={() => onOpenPublished(f.path)}
                  >
                    <span className="draft-item__title">{displayFileName(f.name)}</span>
                    <span className="draft-item__meta">{f.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  )
}

function displayFileName(name) {
  const n = String(name || '')
  return n.replace(/\.html$/i, '') || n || '(untitled)'
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}
