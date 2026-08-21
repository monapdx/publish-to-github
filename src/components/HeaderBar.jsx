export function HeaderBar({ mode, onModeChange, onSaveDraft, onExportDraft, onExportFinal, onOpenHelp }) {
  return (
    <header className="header-bar">
      <div className="header-bar__brand">
        <span className="header-bar__logo" aria-hidden />
        <div className="header-bar__titles">
          <h1>Local Blog Editor</h1>
          <p className="header-bar__subtitle">Write locally, export Markdown when you are ready.</p>
        </div>
      </div>
      <div className="header-bar__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onOpenHelp}>
          Help
        </button>
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
        <button type="button" className="btn btn--ghost" onClick={onExportDraft}>
          Export draft
        </button>
        <button type="button" className="btn btn--primary" onClick={onExportFinal}>
          Export final
        </button>
      </div>
    </header>
  )
}
