import { useEffect, useState } from 'react'
import { BLOG_INDEX } from '../lib/blogPaths'
import { MARKER_BLOCK_SNIPPET, analyzeIndexMarkers } from '../lib/blogIndex'
import { persistPostTemplate } from '../lib/postTemplate'
import { getPostPageTemplate } from '../lib/publishTemplates'
import { serializePost } from '../lib/postSerializer'
import { fetchRepoFileText } from '../lib/github'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
import { detectSiteIntegration } from '../lib/siteIntegration'
import {
  DEFAULT_INDEX_ENTRY_TEMPLATE,
  loadIndexEntryTemplate,
  persistIndexEntryTemplate,
} from '../lib/indexEntryTemplate'
import { READ_ONLY_TEMPLATES } from '../lib/readOnlyTemplates'

export function PostTemplatePanel({
  html,
  onHtmlChange,
  previewContext,
  onPreviewBlocked,
  onTemplateSaved,
  onEditBlogIndex,
  githubSettings,
}) {
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [detectNotes, setDetectNotes] = useState([])
  const [indexHtml, setIndexHtml] = useState('')
  const [entryTpl, setEntryTpl] = useState(() => loadIndexEntryTemplate())
  const [cardTpl, setCardTpl] = useState(READ_ONLY_TEMPLATES.postCardTemplateHtml)
  const [markerCheck, setMarkerCheck] = useState(null)
  const [copyHint, setCopyHint] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => persistIndexEntryTemplate(entryTpl), 400)
    return () => window.clearTimeout(t)
  }, [entryTpl])

  async function handleDetectFromGithub() {
    const token = githubSettings?.token?.trim()
    const owner = githubSettings?.owner?.trim()
    const repo = githubSettings?.repo?.trim()
    const branch = githubSettings?.branch?.trim() || 'main'
    if (!token || !owner || !repo) {
      setDetectError('Connect GitHub first (username, repo, and token).')
      setDetectNotes([])
      return
    }

    setDetectBusy(true)
    setDetectError('')
    setDetectNotes([])
    try {
      const { text } = await fetchRepoFileText({
        token,
        owner,
        repo,
        path: BLOG_INDEX,
        branch,
      })

      const detection = detectSiteIntegration(text)

      setIndexHtml(text)
      onHtmlChange(detection.postTemplate)
      persistPostTemplate(detection.postTemplate)
      persistIndexEntryTemplate(detection.entryTemplate)
      setEntryTpl(detection.entryTemplate)
      setMarkerCheck(null)
      onTemplateSaved?.(
        'Loaded blog/index.html from GitHub: post template includes your nav/footer; listing cards match detected markup.',
      )
      setDetectNotes(detection.messages)
    } catch (err) {
      const { friendly } = getFriendlyGithubError(err, 'fetch')
      setDetectError(friendly)
      setDetectNotes([])
    } finally {
      setDetectBusy(false)
    }
  }

  function handleResetPostTemplate() {
    const bundled = getPostPageTemplate()
    onHtmlChange(bundled)
    persistPostTemplate(bundled)
    onTemplateSaved?.('Restored default post page template.')
    setDetectNotes([])
    setDetectError('')
  }

  function handleSaveTemplate() {
    persistPostTemplate(html)
    persistIndexEntryTemplate(entryTpl)
    onTemplateSaved?.('Post template saved. This HTML wraps every post when you preview in Code mode.')
  }

  function handlePreview() {
    const out = serializePost({
      title: previewContext.title.trim() || 'Untitled',
      content: previewContext.content?.trim() ? previewContext.content : '<p></p>',
      excerpt: previewContext.excerpt.trim(),
      category: previewContext.category?.trim?.() ?? '',
      slug: previewContext.slug.trim() || 'preview-slug',
      date: new Date().toISOString(),
      templateHtml: html,
    })
    const blob = new Blob([out], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) onPreviewBlocked?.()
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
  }

  function runMarkerCheck() {
    const source = indexHtml.trim() ? indexHtml : ''
    if (!source) {
      setMarkerCheck({ kind: 'missing', message: 'Load blog/index.html first, or paste homepage HTML below.' })
      return
    }
    setMarkerCheck(analyzeIndexMarkers(source))
  }

  async function copyMarkers() {
    try {
      await navigator.clipboard.writeText(MARKER_BLOCK_SNIPPET)
      setCopyHint('Copied marker block to clipboard.')
      window.setTimeout(() => setCopyHint(''), 2500)
    } catch {
      setCopyHint('Could not copy — select the block in the homepage editor and copy manually.')
      window.setTimeout(() => setCopyHint(''), 4000)
    }
  }

  const markerOk = markerCheck?.kind === 'ok'

  return (
    <section className="post-template" aria-labelledby="post-template-heading">
      <div className="post-template__header">
        <h2 id="post-template-heading">Post template</h2>
        <p className="post-template__lede">
          Publishing uses your <code>blog/index.html</code> shell plus the bundled post template. You only need this
          screen if you want to customize the generated HTML.
        </p>
        <p className="post-template__lede post-template__lede--muted">
          Bundled publish files: <code>templates/post-page-template.html</code> and{' '}
          <code>templates/post-card-template.html</code>. Preview below uses the local post template stored in this
          browser.
        </p>
      </div>

      <div className="post-template__primary">
        <p className="post-template__resolved-path">
          Homepage on GitHub: <code>{BLOG_INDEX}</code>
        </p>
        <div className="post-template__primary-actions">
          <button
            type="button"
            className="btn btn--sky"
            onClick={() => void handleDetectFromGithub()}
            disabled={detectBusy}
          >
            {detectBusy ? 'Loading from GitHub…' : 'Load blog/index.html'}
          </button>
          <button type="button" className="btn btn--primary" onClick={handlePreview} disabled={detectBusy}>
            Preview template output
          </button>
          <button type="button" className="btn btn--sky" onClick={handleSaveTemplate} disabled={detectBusy}>
            Save template
          </button>
        </div>
        {detectError ? <p className="dialog-error">{detectError}</p> : null}
        {detectNotes.length > 0 ? (
          <ul className="post-template__detect-notes">
            {detectNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="post-template__advanced">
        <details className="post-template__disclosure">
          <summary>Advanced: edit post page template</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              Local preview wrapper for Code mode. GitHub publish still uses the bundled{' '}
              <code>templates/post-page-template.html</code> unless you change that file in the project.
            </p>
            <label className="field post-template__label">
              <span className="visually-hidden">Post page HTML template</span>
              <textarea
                className="post-template__textarea"
                value={html}
                onChange={(e) => onHtmlChange(e.target.value)}
                spellCheck={false}
                rows={14}
              />
            </label>
            <div className="post-template__disclosure-actions">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={handleResetPostTemplate}
                disabled={detectBusy}
              >
                Reset to default template
              </button>
            </div>
          </div>
        </details>

        <details className="post-template__disclosure">
          <summary>Advanced: edit homepage index.html</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              Raw homepage HTML from your repo. Use <strong>Load blog/index.html</strong> above, edit here, then save
              on GitHub with the full editor.
            </p>
            <label className="field post-template__label">
              <span className="visually-hidden">Homepage index.html</span>
              <textarea
                className="post-template__textarea"
                value={indexHtml}
                onChange={(e) => {
                  setIndexHtml(e.target.value)
                  setMarkerCheck(null)
                }}
                spellCheck={false}
                rows={14}
                placeholder="Load blog/index.html to fill this area…"
              />
            </label>
            <div className="post-template__disclosure-actions">
              {onEditBlogIndex ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={onEditBlogIndex}
                  disabled={detectBusy}
                >
                  Open editor to save on GitHub…
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={runMarkerCheck}
                disabled={detectBusy}
              >
                Check for markers
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => void copyMarkers()}
                disabled={detectBusy}
              >
                Copy marker block
              </button>
            </div>
            {copyHint ? <p className="post-template__inline-hint">{copyHint}</p> : null}
            {markerCheck ? (
              <p className={`post-template__marker-status ${markerOk ? 'is-ok' : 'is-warn'}`} role="status">
                <strong>{markerOk ? 'Markers look good.' : 'Marker check:'}</strong>{' '}
                {markerOk ? 'Exactly one start and one end, in the right order.' : markerCheck.message}
              </p>
            ) : null}
            <pre className="post-template__snippet" aria-label="Marker block to copy">
              {MARKER_BLOCK_SNIPPET}
            </pre>
          </div>
        </details>

        <details className="post-template__disclosure">
          <summary>Advanced: edit post card template</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              Reference copy of <code>templates/post-card-template.html</code> (uppercase placeholders). Publish always
              uses the bundled file in this app — edit the project template to change live cards.
            </p>
            <label className="field post-template__label">
              <span className="visually-hidden">Post card template</span>
              <textarea
                className="post-template__textarea"
                value={cardTpl}
                onChange={(e) => setCardTpl(e.target.value)}
                spellCheck={false}
                rows={8}
              />
            </label>
          </div>
        </details>

        <details className="post-template__disclosure">
          <summary>Advanced: edit post listing template</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              Legacy local template for homepage cards (lowercase placeholders). Saved automatically in this browser;
              bundled publish uses <code>post-card-template.html</code> instead.
            </p>
            <label className="field post-template__label">
              <span className="visually-hidden">Post listing template</span>
              <textarea
                className="post-template__textarea"
                value={entryTpl}
                onChange={(e) => setEntryTpl(e.target.value)}
                spellCheck={false}
                rows={10}
                placeholder={DEFAULT_INDEX_ENTRY_TEMPLATE}
              />
            </label>
          </div>
        </details>

        <details className="post-template__disclosure">
          <summary>Template placeholders</summary>
          <div className="post-template__disclosure-body post-template__placeholders-panel">
            <p className="post-template__field-hint">
              Post page preview (local template): title, excerpt, category, slug, and date are escaped;{' '}
              <code>{'{{content}}'}</code> is raw HTML from the editor.
            </p>
            <dl className="post-template__placeholders">
              <div>
                <dt>
                  <code>{'{{title}}'}</code>
                </dt>
                <dd>Post title</dd>
              </div>
              <div>
                <dt>
                  <code>{'{{excerpt}}'}</code>
                </dt>
                <dd>Excerpt (e.g. meta description)</dd>
              </div>
              <div>
                <dt>
                  <code>{'{{category}}'}</code>
                </dt>
                <dd>Category label</dd>
              </div>
              <div>
                <dt>
                  <code>{'{{content}}'}</code>
                </dt>
                <dd>Article HTML from the editor</dd>
              </div>
              <div>
                <dt>
                  <code>{'{{slug}}'}</code>
                </dt>
                <dd>URL slug</dd>
              </div>
              <div>
                <dt>
                  <code>{'{{date}}'}</code>
                </dt>
                <dd>Publish time (ISO 8601). Preview uses the current time.</dd>
              </div>
            </dl>
            <p className="post-template__field-hint">
              Bundled publish card/page templates use uppercase keys such as <code>{'{{TITLE}}'}</code>,{' '}
              <code>{'{{SLUG}}'}</code>, <code>{'{{URL}}'}</code>, <code>{'{{EXCERPT}}'}</code>,{' '}
              <code>{'{{CATEGORY}}'}</code>, <code>{'{{CONTENT}}'}</code>.
            </p>
            <p className="post-template__help-tip">
              Optional GitHub round-trip meta tags:{' '}
              <code>{'<meta name="blog-editor:title" content="{{title}}" />'}</code> and matching excerpt/category
              tags in <code>&lt;head&gt;</code>.
            </p>
          </div>
        </details>
      </div>
    </section>
  )
}
