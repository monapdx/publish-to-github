export function DraftList({ drafts, currentDraftId, onOpen, onDelete, onNew }) {
  return (
    <aside className="draft-list" aria-label="Drafts">
      <div className="draft-list__header">
        <h2>Drafts</h2>
        <button type="button" className="btn btn--small btn--ghost" onClick={onNew}>
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
                onClick={() => onOpen(d.id)}
              >
                <span className="draft-item__title">{d.title || '(Untitled)'}</span>
                <span className="draft-item__meta">
                  {formatDate(d.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                className="draft-item__delete"
                aria-label={`Delete draft ${d.title || d.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(d.id)
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
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
