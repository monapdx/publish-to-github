import { useCallback, useState } from 'react'
import { DEFAULT_POST_TEMPLATE_HTML, persistPostTemplate } from '../lib/postTemplate'
import { serializePost } from '../lib/postSerializer'
import { fetchRepoFileText } from '../lib/github'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
import { resolveIndexPath, normalizeIndexPagePath } from '../lib/indexPagePath'
import { detectSiteIntegration } from '../lib/siteIntegration'
import { persistIndexEntryTemplate } from '../lib/indexEntryTemplate'

export function PostTemplatePanel({
  html,
  onHtmlChange,
  previewContext,
  onPreviewBlocked,
  onTemplateSaved,
  onEditBlogIndex,
  githubSettings,
  onGithubSettingsChange,
}) {
  const [indexPageInput, setIndexPageInput] = useState(
    () => githubSettings?.indexPagePath?.trim() || resolveIndexPath(githubSettings || {}),
  )
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [detectNotes, setDetectNotes] = useState([])

  const saveIndexPagePath = useCallback(
    (value) => {
      const normalized = normalizeIndexPagePath(value, githubSettings?.postsPath)
      onGithubSettingsChange?.({
        ...githubSettings,
        indexPagePath: value.trim() ? normalized : '',
      })
    },
    [githubSettings, onGithubSettingsChange],
  )

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
      const indexPath = normalizeIndexPagePath(indexPageInput, githubSettings.postsPath)
      saveIndexPagePath(indexPageInput)
      setIndexPageInput(indexPath)

      const { text } = await fetchRepoFileText({
        token,
        owner,
        repo,
        path: indexPath,
        branch,
      })

      const detection = detectSiteIntegration(text, {
        indexPagePath: indexPath,
        postsPath: githubSettings.postsPath,
      })

      onHtmlChange(detection.postTemplate)
      persistPostTemplate(detection.postTemplate)
      persistIndexEntryTemplate(detection.entryTemplate)
      setDetectNotes(detection.messages)
      onTemplateSaved?.(
        'Loaded the blog index from GitHub: post template now includes your nav/footer/styles; listing cards match detected markup.',
      )
    } catch (err) {
      const { friendly } = getFriendlyGithubError(err, 'fetch')
      setDetectError(friendly)
      setDetectNotes([])
    } finally {
      setDetectBusy(false)
    }
  }

  function handleReset() {
    onHtmlChange(DEFAULT_POST_TEMPLATE_HTML)
    persistPostTemplate(DEFAULT_POST_TEMPLATE_HTML)
    onTemplateSaved?.('Restored default template.')
    setDetectNotes([])
    setDetectError('')
  }

  function handleSaveTemplate() {
    persistPostTemplate(html)
    saveIndexPagePath(indexPageInput)
    onTemplateSaved?.('Post template saved. This HTML wraps every post when you publish.')
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

  const resolvedPath = normalizeIndexPagePath(indexPageInput, githubSettings?.postsPath)

  return (
    <section className="post-template" aria-labelledby="post-template-heading">
      <div className="post-template__header">
        <h2 id="post-template-heading">Post Template &amp; site layout</h2>
        <p className="post-template__lede">
          Point at your <strong>blog index page</strong> on GitHub, then load it to copy navigation, footer, styles,
          and listing-card markup into this app. Individual posts use the full-page HTML below (with{' '}
          <code>{'{{content}}'}</code>); new publishes are added to the index file at the path you set.
        </p>
      </div>

      <div className="post-template__integration">
        <label className="field post-template__index-field" htmlFor="blog-index-page-path">
          <span>Blog index page (repo path or URL)</span>
          <span className="field-help">
            File where new posts are listed — e.g. <code>blog/index.html</code> or a GitHub blob URL. Leave blank to use{' '}
            <code>{resolveIndexPath(githubSettings || {})}</code> from your posts folder.
          </span>
          <input
            id="blog-index-page-path"
            type="text"
            value={indexPageInput}
            onChange={(e) => setIndexPageInput(e.target.value)}
            onBlur={() => saveIndexPagePath(indexPageInput)}
            placeholder="blog/index.html"
            disabled={detectBusy}
          />
        </label>
        <p className="post-template__resolved-path">
          Resolves to: <code>{resolvedPath}</code>
        </p>
        <div className="post-template__integration-actions">
          <button
            type="button"
            className="btn btn--sky"
            onClick={() => void handleDetectFromGithub()}
            disabled={detectBusy}
          >
            {detectBusy ? 'Loading from GitHub…' : 'Load index & detect layout'}
          </button>
          {onEditBlogIndex ? (
            <button type="button" className="btn btn--ghost" onClick={onEditBlogIndex} disabled={detectBusy}>
              Edit homepage HTML
            </button>
          ) : null}
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

      <div className="post-template__grid">
        <div className="post-template__editor">
          <label className="field post-template__label">
            <span>Full-page HTML (every published post)</span>
            <textarea
              className="post-template__textarea"
              value={html}
              onChange={(e) => onHtmlChange(e.target.value)}
              spellCheck={false}
              aria-describedby="post-template-help"
              rows={18}
            />
          </label>
          <div className="post-template__actions">
            <button type="button" className="btn btn--ghost" onClick={handleReset} disabled={detectBusy}>
              Reset to Default Template
            </button>
            <button type="button" className="btn btn--sky" onClick={handleSaveTemplate} disabled={detectBusy}>
              Save template
            </button>
            <button type="button" className="btn btn--primary" onClick={handlePreview} disabled={detectBusy}>
              Preview Template Output
            </button>
          </div>
        </div>

        <aside id="post-template-help" className="post-template__help">
          <h3 className="post-template__help-title">Navigation &amp; footer</h3>
          <p className="post-template__help-intro">
            Use <strong>Load index &amp; detect layout</strong> to pull <code>&lt;nav&gt;</code>,{' '}
            <code>&lt;header&gt;</code>, <code>&lt;footer&gt;</code>, and stylesheet links from your live index file.
            Or paste that HTML here manually around <code>{'{{content}}'}</code> inside <code>&lt;article&gt;</code>.
          </p>
          <h3 className="post-template__help-title post-template__help-title--sub">Placeholders</h3>
          <p className="post-template__help-intro">
            Title, excerpt, category, slug, and date are escaped for HTML;{' '}
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
              <dd>Category label on index cards</dd>
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
          <p className="post-template__help-tip">
            Optional for GitHub round-trip add{' '}
            <code>{'<meta name="blog-editor:title" content="{{title}}" />'}</code>,{' '}
            <code>{'<meta name="blog-editor:excerpt" content="{{excerpt}}" />'}</code>, and{' '}
            <code>{'<meta name="blog-editor:category" content="{{category}}" />'}</code> in{' '}
            <code>&lt;head&gt;</code>.
          </p>
        </aside>
      </div>
    </section>
  )
}
