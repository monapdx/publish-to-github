import { useState } from 'react'

const defaultForm = {
  code: '',
  language: '',
}

export function CodeSnippetDialog({ open, onClose, onInsert }) {
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    setError('')
    const code = form.code
    if (!code.trim()) {
      setError('Add some code, or cancel.')
      return
    }
    onInsert({
      code,
      language: form.language.trim(),
    })
    setForm(defaultForm)
    onClose()
  }

  function handleClose() {
    setForm(defaultForm)
    setError('')
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={handleClose}>
      <div
        className="dialog dialog--snippet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snippet-dialog-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="snippet-dialog-title">Insert code snippet</h2>
        <p className="dialog-hint">
          Inserts a fenced-style code block. The editor draws triple-backtick lines above and below; published HTML is a
          normal pre/code block for your site stylesheet.
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Optional language label</span>
            <input
              type="text"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              placeholder="e.g. javascript, css, html"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Code</span>
            <textarea
              className="dialog-textarea dialog-textarea--code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder={'// paste or type here\nfunction example() {\n  return true\n}'}
              rows={12}
              spellCheck={false}
              autoFocus
            />
          </label>
          {error ? <p className="dialog-error">{error}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
