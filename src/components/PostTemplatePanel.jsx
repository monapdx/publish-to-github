import { useState } from 'react'
import { BLOG_INDEX } from '../lib/blogPaths'
import { DEFAULT_POST_TEMPLATE_HTML, persistPostTemplate } from '../lib/postTemplate'
import { getPostPageTemplate } from '../lib/publishTemplates'
import { serializePost } from '../lib/postSerializer'
import { fetchRepoFileText } from '../lib/github'
import { getFriendlyGithubError } from '../lib/githubFriendlyMessages'
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
}) {
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [detectNotes, setDetectNotes] = useState([])

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

      onHtmlChange(detection.postTemplate)
      persistPostTemplate(detection.postTemplate)
      persistIndexEntryTemplate(detection.entryTemplate)
      setDetectNotes(detection.messages)
      onTemplateSaved?.(
        'Loaded blog/index.html from GitHub: post template includes your nav/footer; listing cards match detected markup.',
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
    const bundled = getPostPageTemplate()
    onHtmlChange(bundled)
    persistPostTemplate(bundled)
    onTemplateSaved?.('Restored default template.')
    setDetectNotes([])
    setDetectError('')
  }

  function handleSaveTemplate() {
    persistPostTemplate(html)
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

  return (
    <section className="post-template" aria-labelledby="post-template-heading">
      <div className="post-template__header">
        <h2 id="post-template-heading">Post template</h2>
        <p className="post-template__lede">
          <strong>Publishing</strong> always uses the bundled file <code>templates/post-page-template.html</code>{' '}
          (header, footer, <code>{'{{CONTENT}}'}</code> area). This editor is for preview and optional tweaks; it does
          not change what gets uploaded unless you edit the repo template in the project. Load{' '}
          <code>blog/index.html</code> from GitHub to refresh nav/footer markup here.
        </p>
      </div>

      <div className="post-template__integration">
        <p className="post-template__resolved-path">
          Homepage: <code>{BLOG_INDEX}</code>
        </p>
        <div className="post-template__integration-actions">
          <button
            type="button"
            className="btn btn--sky"
            onClick={() => void handleDetectFromGithub()}
            disabled={detectBusy}
          >
            {detectBusy ? 'Loading from GitHub…' : 'Load blog/index.html'}
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
            Use <strong>Load blog/index.html</strong> to pull <code>&lt;nav&gt;</code>, <code>&lt;header&gt;</code>,{' '}
            <code>&lt;footer&gt;</code>, and stylesheet links from your live homepage. Or paste that HTML manually around{' '}
            <code>{'{{content}}'}</code> inside <code>&lt;article&gt;</code>.
          </p>
          <h3 className="post-template__help-title post-template__help-title--sub">Placeholders</h3>
          <p className="post-template__help-intro">
            Title, excerpt, category, slug, and date are escaped for HTML; <code>{'{{content}}'}</code> is raw HTML from
            the editor.
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
            <code>{'<meta name="blog-editor:category" content="{{category}}" />'}</code> in <code>&lt;head&gt;</code>.
          </p>
        </aside>
      </div>
    </section>
  )
}
