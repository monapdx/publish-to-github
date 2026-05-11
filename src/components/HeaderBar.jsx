export function HeaderBar({ mode, onModeChange, onSaveDraft, onPublish, onOpenHelp, onEditBlogIndex }) {
  return (
    <header className="header-bar">
      <div className="header-bar__brand">
        <span className="header-bar__logo" aria-hidden />
        <div className="header-bar__titles">
          <h1>Publish to GitHub</h1>
          <p className="header-bar__subtitle">Write posts, then send them to your site folder.</p>
        </div>
      </div>
      <div className="header-bar__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onOpenHelp}>
          Help
        </button>
        {onEditBlogIndex ? (
          <button type="button" className="btn btn--ghost btn--small" onClick={onEditBlogIndex}>
            Edit homepage
          </button>
        ) : null}
        <div className="segmented" role="group" aria-label="Editor mode">
          <button
            type="button"
            className={mode === 'visual' ? 'is-active' : ''}
            onClick={() => onModeChange('visual')}
          >
            Visual
          </button>
          <button
            type="button"
            className={mode === 'code' ? 'is-active' : ''}
            onClick={() => onModeChange('code')}
          >
            Code
          </button>
        </div>
        <button type="button" className="btn btn--ghost btn--sky" onClick={onSaveDraft}>
          Save draft locally
        </button>
        <button type="button" className="btn btn--primary" onClick={onPublish}>
          Connection &amp; publish
        </button>
      </div>
    </header>
  )
}
