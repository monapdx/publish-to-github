export function DraftList({
  listTab,
  onListTabChange,
  drafts,
  finals,
  currentDraftId,
  currentFinalId,
  onOpenDraft,
  onOpenFinal,
  onDeleteDraft,
  onDeleteFinal,
  onNew,
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
          onClick={() => onListTabChange('finals')}
        >
          Finals
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
            <p className="draft-list__empty">
              No drafts yet. Write a title and your post, then use <strong>Save draft</strong> in the top bar to keep a
              copy on this computer.
            </p>
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
            <h2>Final versions</h2>
          </div>
          {finals.length === 0 ? (
            <p className="draft-list__empty">
              No final versions yet. When a post is ready, use <strong>Export final</strong> in the top bar to download
              Markdown and keep a local copy here.
            </p>
          ) : (
            <ul className="draft-list__items draft-list__items--published">
              {finals.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`draft-item ${row.id === currentFinalId ? 'is-active' : ''}`}
                    onClick={() => onOpenFinal(row.id)}
                  >
                    <span className="draft-item__title">{row.title || '(Untitled)'}</span>
                    <span className="draft-item__meta">{formatDate(row.finalizedAt || row.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    className="draft-item__delete"
                    aria-label={`Delete final ${row.title || row.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFinal(row.id)
                    }}
                  >
                    ×
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

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}
