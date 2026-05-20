import { useState } from 'react'
import { defaultGithubSettings } from '../lib/githubSettings'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
import { PublishValidationError } from '../lib/publishTemplates'
import { GithubSettingsFields } from './GithubSettingsFields'

export function PublishDialog({ open, onClose, initialSettings, onPublish, onSaveSettings }) {
  const [form, setForm] = useState(() => ({
    ...defaultGithubSettings(),
    ...initialSettings,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

  if (!open) return null

  function validateConnection() {
    if (!form.token.trim() || !form.owner.trim() || !form.repo.trim()) {
      setError('Please add your GitHub username, repository name, and personal access token.')
      setErrorDetail('')
      return false
    }
    return true
  }

  function handleSaveSettings() {
    setError('')
    setErrorDetail('')
    if (!validateConnection()) return
    onSaveSettings?.({ ...form })
    onClose()
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setErrorDetail('')
    if (!validateConnection()) return
    setBusy(true)
    try {
      await onPublish({ ...form })
      onClose()
    } catch (err) {
      if (err instanceof PublishValidationError) {
        setError(err.message)
        setErrorDetail('')
        return
      }
      const { friendly, technical } = getFriendlyGithubError(err, 'publish')
      setError(friendly)
      setErrorDetail(technical)
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
        <h2 id="publish-dialog-title">Connection &amp; publish</h2>
        <p className="dialog-hint dialog-hint--soft">
          Your details are stored in <strong>this browser on this computer</strong> after you publish successfully or
          when you click <strong>Save connection settings</strong>. To change them later, open this window again from
          the top bar.
        </p>
        <form onSubmit={submit}>
          <GithubSettingsFields form={form} setForm={setForm} idPrefix="publish" disabled={busy} tokenLast />

          <p className="dialog-hint dialog-hint--compact">
            First publish bootstraps <code>blog/</code> on GitHub (index from templates, style.css, posts/, .nojekyll,
            Pages workflow) from read-only app templates, then writes <code>blog/posts/your-slug.html</code> and updates{' '}
            <code>blog/index.html</code>.
          </p>

          {error ? <p className="dialog-error">{error}</p> : null}
          {errorDetail ? (
            <details className="dialog-error-details">
              <summary>Details for troubleshooting</summary>
              <pre>{errorDetail}</pre>
            </details>
          ) : null}

          <div className="dialog-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              Close
            </button>
            {onSaveSettings ? (
              <button type="button" className="btn btn--ghost btn--sky" onClick={handleSaveSettings} disabled={busy}>
                Save connection settings
              </button>
            ) : null}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Publishing…' : 'Publish to GitHub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
