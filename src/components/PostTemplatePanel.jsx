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
import { addStylesheets } from '../lib/customStylesheets'

export function PostTemplatePanel({
  html,
  onHtmlChange,
  stylesheets,
  onStylesheetsChange,
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
    onTemplateSaved?.('Post template saved. New published posts will use this HTML and your stylesheet links.')
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
    let preview
    try { preview = addStylesheets(out, stylesheets) }
    catch (err) { onTemplateSaved?.(err.message); return }
    const owner = githubSettings?.owner?.trim()
    const repo = githubSettings?.repo?.trim()
    const base = owner && repo
      ? `https://${encodeURIComponent(owner)}.github.io/${encodeURIComponent(repo)}/blog/posts/`
      : ''
    const previewHtml = base && /<head\b[^>]*>/i.test(preview)
      ? preview.replace(/<head\b[^>]*>/i, (match) => `${match}\n    <base href="${base}" />`)
      : preview
    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' })
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
          Customize the HTML and CSS links used for new published posts. Loading <code>blog/index.html</code> copies
          its navigation, footer, and stylesheet links into the post template.
        </p>
        <p className="post-template__lede post-template__lede--muted">
          Settings are saved in this browser. Existing posts keep their current design until you republish them.
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
        <details className="post-template__disclosure" open>
          <summary>Additional stylesheets for posts</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              One CSS URL per line. Use an HTTPS URL or a path relative to <code>blog/posts/</code>, such as{' '}
              <code>../my-theme.css</code>. These links are added after the template’s existing stylesheets, so their
              rules can override earlier ones. Upload local CSS files to your site repository first.
              Preview resolves relative paths against the standard GitHub Pages address for your repository.
            </p>
            <label className="field post-template__label">
              <span>Stylesheet URLs</span>
              <textarea className="post-template__textarea" value={stylesheets}
                onChange={(e) => onStylesheetsChange(e.target.value)} rows={4}
                placeholder={'../my-theme.css\nhttps://example.com/extra.css'} spellCheck={false} />
            </label>
          </div>
        </details>
        <details className="post-template__disclosure">
          <summary>Advanced: edit post page template</summary>
          <div className="post-template__disclosure-body">
            <p className="post-template__field-hint">
              This HTML is used for previews and new published posts. Keep <code>{'{{TITLE}}'}</code> and{' '}
              <code>{'{{CONTENT}}'}</code> placeholders so each post has its own title and body.
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
