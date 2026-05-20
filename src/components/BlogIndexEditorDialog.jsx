import { useCallback, useEffect, useState } from 'react'
import { GitHubApiError, fetchRepoFileText, getFileSha, upsertFile } from '../lib/github'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
import { analyzeIndexMarkers, defaultIndexHtml } from '../lib/blogIndex'
import { BLOG_INDEX } from '../lib/blogPaths'

export function BlogIndexEditorDialog({ settings, onClose, onSaved }) {
  const indexPath = BLOG_INDEX
  const [html, setHtml] = useState('')
  const [remoteSha, setRemoteSha] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadErrorDetail, setLoadErrorDetail] = useState('')
  const [busyLoad, setBusyLoad] = useState(true)
  const [busySave, setBusySave] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveErrorDetail, setSaveErrorDetail] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [baselineHtml, setBaselineHtml] = useState('')

  const reloadFromGithub = useCallback(async () => {
    const token = settings.token?.trim()
    const owner = settings.owner?.trim()
    const repo = settings.repo?.trim()
    const branch = settings.branch?.trim() || 'main'
    if (!token || !owner || !repo) return

    setBusyLoad(true)
    setLoadError('')
    setLoadErrorDetail('')
    try {
      const res = await fetchRepoFileText({ token, owner, repo, path: indexPath, branch })
      setHtml(res.text)
      setRemoteSha(res.sha)
      setBaselineHtml(res.text)
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) {
        const starter = defaultIndexHtml()
        setHtml(starter)
        setRemoteSha(null)
        setBaselineHtml(starter)
      } else {
        const { friendly, technical } = getFriendlyGithubError(err, 'fetch')
        setLoadError(friendly)
        setLoadErrorDetail(technical)
      }
    } finally {
      setBusyLoad(false)
    }
  }, [settings, indexPath])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reloadFromGithub()
    }, 0)
    return () => window.clearTimeout(id)
  }, [reloadFromGithub])

  function requestSave() {
    setSaveError('')
    setSaveErrorDetail('')
    setConfirmOpen(true)
  }

  async function performSave() {
    const token = settings.token?.trim()
    const owner = settings.owner?.trim()
    const repo = settings.repo?.trim()
    const branch = settings.branch?.trim() || 'main'
    if (!token || !owner || !repo) return

    setBusySave(true)
    setSaveError('')
    setSaveErrorDetail('')
    try {
      const sha = await getFileSha({
        token,
        owner,
        repo,
        path: indexPath,
        branch,
      })
      if (remoteSha != null && sha != null && sha !== remoteSha) {
        setSaveError(
          'This file changed on GitHub since you loaded it. Click “Reload from GitHub” to refresh, then apply your edits again so nothing is overwritten by mistake.',
        )
        setSaveErrorDetail(`Expected SHA ${remoteSha ?? 'null'}, server has ${sha ?? 'null'}`)
        setBusySave(false)
        setConfirmOpen(false)
        return
      }

      const body = await upsertFile({
        token,
        owner,
        repo,
        path: indexPath,
        branch,
        content: html,
        message: `Update homepage: ${indexPath}`,
        sha,
      })
      const newSha = body?.content?.sha ?? null
      setRemoteSha(newSha ?? (await getFileSha({ token, owner, repo, path: indexPath, branch })))
      setBaselineHtml(html)
      onSaved?.()
      setConfirmOpen(false)
      onClose()
    } catch (err) {
      setConfirmOpen(false)
      const { friendly, technical } = getFriendlyGithubError(err, 'publish')
      setSaveError(friendly)
      setSaveErrorDetail(technical)
    } finally {
      setBusySave(false)
    }
  }

  const dirty = html !== baselineHtml

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--blog-index"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blog-index-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="blog-index-title">Save homepage to GitHub</h2>
        <p className="dialog-hint dialog-hint--soft">
          Upload the full <code>{indexPath}</code> file. Marker checks and listing templates are in the Code view
          advanced sections.
        </p>

        {busyLoad ? <p className="dialog-hint">Loading from GitHub…</p> : null}
        {loadError ? (
          <>
            <p className="dialog-error">{loadError}</p>
            {loadErrorDetail ? (
              <details className="dialog-error-details">
                <summary>Details for troubleshooting</summary>
                <pre>{loadErrorDetail}</pre>
              </details>
            ) : null}
          </>
        ) : null}

        <div className="blog-index__toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => reloadFromGithub()}
            disabled={busyLoad || busySave}
          >
            Reload from GitHub
          </button>
        </div>

        {dirty ? (
          <p className="dialog-hint dialog-hint--compact">
            You have unsaved edits ({Math.abs(html.length - baselineHtml.length)} characters different from last load).
          </p>
        ) : (
          <p className="dialog-hint dialog-hint--compact">No unsaved edits compared to what you last loaded.</p>
        )}

        <label className="field" htmlFor="blog-index-html">
          <span>Homepage HTML</span>
          <span className="field-help">Saving replaces this file on GitHub for the branch you connected.</span>
          <textarea
            id="blog-index-html"
            className="blog-index__textarea"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            disabled={busyLoad}
          />
        </label>

        {saveError ? <p className="dialog-error">{saveError}</p> : null}
        {saveErrorDetail ? (
          <details className="dialog-error-details">
            <summary>Details for troubleshooting</summary>
            <pre>{saveErrorDetail}</pre>
          </details>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busySave}>
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={requestSave} disabled={busyLoad || busySave}>
            Save index.html to GitHub…
          </button>
        </div>

        {confirmOpen ? (
          <div className="dialog-confirm-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
            <div
              className="dialog dialog--confirm"
              role="alertdialog"
              aria-labelledby="confirm-save-title"
              onMouseDown={(ev) => ev.stopPropagation()}
            >
              <h3 id="confirm-save-title">Save entire homepage file?</h3>
              {(() => {
                const c = analyzeIndexMarkers(html)
                return c.kind !== 'ok' ? (
                  <p className="dialog-error" role="alert">
                    <strong>Marker warning:</strong> {c.message} Automatic “new post” inserts will not work until this
                    is fixed, but you can still save the file if you mean to.
                  </p>
                ) : null
              })()}
              <p className="dialog-hint dialog-hint--compact">
                This uploads your current text as <code>{indexPath}</code> and replaces the copy on GitHub for branch{' '}
                <strong>{settings.branch?.trim() || 'main'}</strong>. If you are unsure, click Cancel and use Reload
                from GitHub first.
              </p>
              <div className="dialog-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmOpen(false)} disabled={busySave}>
                  Cancel
                </button>
                <button type="button" className="btn btn--primary" onClick={() => void performSave()} disabled={busySave}>
                  {busySave ? 'Saving…' : 'Yes, save to GitHub'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
