export function HeaderBar({ mode, onModeChange, onSaveDraft, onPublish }) {
  return (
    <header className="header-bar">
      <div className="header-bar__brand">
        <span className="header-bar__logo" aria-hidden />
        <h1>Blog Editor</h1>
      </div>
      <div className="header-bar__actions">
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
          Save draft
        </button>
        <button type="button" className="btn btn--primary" onClick={onPublish}>
          Publish
        </button>
      </div>
    </header>
  )
}
