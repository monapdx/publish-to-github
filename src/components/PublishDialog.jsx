import { useState } from 'react'
import { defaultGithubSettings } from '../lib/githubSettings'

export function PublishDialog({ open, onClose, initialSettings, onPublish }) {
  const [form, setForm] = useState(() => ({
    ...defaultGithubSettings(),
    ...initialSettings,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.token.trim() || !form.owner.trim() || !form.repo.trim()) {
      setError('Token, owner, and repository name are required.')
      return
    }
    setBusy(true)
    try {
      await onPublish({ ...form })
      onClose()
    } catch (err) {
      setError(err?.message || 'Publish failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--publish"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="publish-dialog-title">Publish to GitHub</h2>
        <p className="dialog-hint">
          Uses the{' '}
          <a href="https://docs.github.com/en/rest/repos/contents" target="_blank" rel="noreferrer">
            Contents API
          </a>
          . Prefer a fine-scoped token with <code>contents: write</code> for this repository.
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Personal access token</span>
            <input
              type="password"
              autoComplete="off"
              value={form.token}
              onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
              placeholder="github_pat_…"
              required
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Owner</span>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                placeholder="octocat"
                required
              />
            </label>
            <label className="field">
              <span>Repository</span>
              <input
                type="text"
                value={form.repo}
                onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
                placeholder="my-site"
                required
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Branch</span>
              <input
                type="text"
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Posts folder</span>
              <input
                type="text"
                value={form.postsPath}
                onChange={(e) => setForm((f) => ({ ...f, postsPath: e.target.value }))}
                placeholder="blog/"
              />
            </label>
          </div>
          <p className="dialog-hint dialog-hint--compact">
            Published HTML uses your <strong>Post Template</strong>. Edit it in{' '}
            <strong>Code</strong> view ({' '}
            <code>{'{{title}}'}</code>, <code>{'{{content}}'}</code>, etc.).
          </p>
          {error ? <p className="dialog-error">{error}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
