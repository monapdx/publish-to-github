import { useState } from 'react'
import { defaultGithubSettings } from '../lib/githubSettings'
import { GithubSettingsFields } from './GithubSettingsFields'

export function FirstRunSetup({ initialSettings, onSave, onOpenHelp }) {
  const [form, setForm] = useState(() => ({
    ...defaultGithubSettings(),
    ...initialSettings,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function validate() {
    if (!form.token.trim() || !form.owner.trim() || !form.repo.trim()) {
      setError('Please fill in your GitHub username, repository name, and personal access token.')
      return false
    }
    setError('')
    return true
  }

  function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      onSave({ ...form })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="first-run">
      <header className="first-run__top">
        <div className="first-run__brand">
          <span className="first-run__logo" aria-hidden />
          <div>
            <h1 className="first-run__title">Publish to GitHub</h1>
            <p className="first-run__tagline">Local writing tool — connect once, then publish posts as files.</p>
          </div>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={onOpenHelp}>
          Getting Started
        </button>
      </header>

      <div className="first-run__card">
        <h2 className="first-run__card-title">Welcome — let’s connect your site</h2>
        <p className="first-run__lede">
          This app saves posts as HTML files in <strong>your</strong> GitHub project. Nothing is sent to a company
          server: your browser talks straight to GitHub. Fill in the details below so we know where to put new posts.
        </p>

        <form className="first-run__form" onSubmit={handleSave}>
          <GithubSettingsFields form={form} setForm={setForm} idPrefix="setup" disabled={busy} tokenLast />

          <div className="first-run__storage-note">
            <strong>Where settings are saved:</strong> in this browser only, under this site address (like a small
            notebook on your computer). To change them later, use <strong>Publish</strong> in the top bar after you
            finish setup.
          </div>

          {error ? <p className="dialog-error">{error}</p> : null}

          <div className="first-run__actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save and open editor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
