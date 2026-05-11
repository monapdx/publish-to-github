import { useCallback, useEffect, useState } from 'react'
import { GitHubApiError, fetchRepoFileText, getFileSha, upsertFile } from '../lib/github'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
import { MARKER_BLOCK_SNIPPET, analyzeIndexMarkers, defaultIndexHtml, getIndexPath } from '../lib/blogIndex'
import {
  DEFAULT_INDEX_ENTRY_TEMPLATE,
  loadIndexEntryTemplate,
  persistIndexEntryTemplate,
} from '../lib/indexEntryTemplate'

export function BlogIndexEditorDialog({ settings, onClose, onSaved }) {
  const indexPath = getIndexPath(settings.postsPath)
  const [html, setHtml] = useState('')
  const [remoteSha, setRemoteSha] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadErrorDetail, setLoadErrorDetail] = useState('')
  const [busyLoad, setBusyLoad] = useState(true)
  const [busySave, setBusySave] = useState(false)
  const [markerCheck, setMarkerCheck] = useState(null)
  const [entryTpl, setEntryTpl] = useState(() => loadIndexEntryTemplate())
  const [saveError, setSaveError] = useState('')
  const [saveErrorDetail, setSaveErrorDetail] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [copyHint, setCopyHint] = useState('')
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
    setMarkerCheck(null)
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

  useEffect(() => {
    const t = window.setTimeout(() => persistIndexEntryTemplate(entryTpl), 400)
    return () => window.clearTimeout(t)
  }, [entryTpl])

  function runMarkerCheck() {
    const a = analyzeIndexMarkers(html)
    setMarkerCheck(a)
  }

  async function copyMarkers() {
    try {
      await navigator.clipboard.writeText(MARKER_BLOCK_SNIPPET)
      setCopyHint('Copied to clipboard.')
      window.setTimeout(() => setCopyHint(''), 2500)
    } catch {
      setCopyHint('Could not copy — select the block above and copy manually.')
      window.setTimeout(() => setCopyHint(''), 4000)
    }
  }

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
      persistIndexEntryTemplate(entryTpl)
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
  const markerOk = markerCheck ? markerCheck.kind === 'ok' : false

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--blog-index"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blog-index-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <h2 id="blog-index-title">Edit homepage (index.html)</h2>
        <p className="dialog-hint dialog-hint--soft">
          This is the <strong>homepage file</strong> at <code>{indexPath}</code> in your connected repo. You edit the
          raw HTML here. <strong>Marker comments</strong> are invisible notes in the HTML that tell this app where to
          drop new post cards after you publish.
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
          <button type="button" className="btn btn--ghost btn--small" onClick={() => reloadFromGithub()} disabled={busyLoad || busySave}>
            Reload from GitHub
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={runMarkerCheck} disabled={busyLoad}>
            Check for markers
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={copyMarkers} disabled={busyLoad}>
            Copy marker block
          </button>
        </div>

        {copyHint ? <p className="dialog-hint dialog-hint--compact">{copyHint}</p> : null}

        <div className="blog-index__markers-help">
          <p className="dialog-hint dialog-hint--compact">
            To automatically add new posts to your homepage, paste these two marker comments into your{' '}
            <code>index.html</code> where you want new posts to appear. New posts will be added <strong>between</strong>{' '}
            them after publishing (newest first). They do not show up on the public page — they are only instructions
            for this app.
          </p>
          <pre className="blog-index__snippet" aria-label="Marker block to copy">
            {MARKER_BLOCK_SNIPPET}
          </pre>
        </div>

        {markerCheck ? (
          <div className={`blog-index__check ${markerOk ? 'is-ok' : 'is-warn'}`} role="status">
            <strong>{markerOk ? 'Markers look good.' : 'Marker check'}</strong>
            <span>
              {' '}
              {markerOk
                ? 'Exactly one start and one end, in the right order.'
                : markerCheck.message}
            </span>
          </div>
        ) : null}

        {dirty ? (
          <p className="dialog-hint dialog-hint--compact">
            You have unsaved edits ({Math.abs(html.length - baselineHtml.length)} characters different from last load).
          </p>
        ) : (
          <p className="dialog-hint dialog-hint--compact">No unsaved edits compared to what you last loaded.</p>
        )}

        <label className="field" htmlFor="blog-index-html">
          <span>Homepage HTML</span>
          <span className="field-help">The full file. Saving replaces this file on GitHub for the branch you connected.</span>
          <textarea
            id="blog-index-html"
            className="blog-index__textarea"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            disabled={busyLoad}
          />
        </label>

        <label className="field" htmlFor="blog-index-entry-tpl">
          <span>Post listing template (each new post)</span>
          <span className="field-help">
            HTML for one post on the homepage. Placeholders:{' '}
            <code>{'{{title}}'}</code>, <code>{'{{url}}'}</code> (link to the .html file), <code>{'{{date}}'}</code>{' '}
            (readable date), <code>{'{{dateIso}}'}</code> (machine date), <code>{'{{excerpt}}'}</code>,{' '}
            <code>{'{{slug}}'}</code>, <code>{'{{category}}'}</code>. Values are escaped for safety.
          </span>
          <textarea
            id="blog-index-entry-tpl"
            className="blog-index__textarea blog-index__textarea--short"
            value={entryTpl}
            onChange={(e) => setEntryTpl(e.target.value)}
            spellCheck={false}
            placeholder={DEFAULT_INDEX_ENTRY_TEMPLATE}
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
