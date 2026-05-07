import { DEFAULT_POST_TEMPLATE_HTML, persistPostTemplate } from '../lib/postTemplate'
import { serializePost } from '../lib/postSerializer'

export function PostTemplatePanel({ html, onHtmlChange, previewContext, onPreviewBlocked }) {
  function handleReset() {
    onHtmlChange(DEFAULT_POST_TEMPLATE_HTML)
    persistPostTemplate(DEFAULT_POST_TEMPLATE_HTML)
  }

  function handlePreview() {
    const out = serializePost({
      title: previewContext.title.trim() || 'Untitled',
      content: previewContext.content?.trim() ? previewContext.content : '<p></p>',
      excerpt: previewContext.excerpt.trim(),
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
        <h2 id="post-template-heading">Post Template</h2>
        <p className="post-template__lede">
          Full HTML wrapper used when you publish (shown only in Code view). Add navigation, footer,
          stylesheets, and scripts.
        </p>
      </div>

      <div className="post-template__grid">
        <div className="post-template__editor">
          <label className="field post-template__label">
            <span>Full-page HTML</span>
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
            <button type="button" className="btn btn--ghost" onClick={handleReset}>
              Reset to Default Template
            </button>
            <button type="button" className="btn btn--primary" onClick={handlePreview}>
              Preview Template Output
            </button>
          </div>
        </div>

        <aside id="post-template-help" className="post-template__help">
          <h3 className="post-template__help-title">Placeholders</h3>
          <p className="post-template__help-intro">
            Title, excerpt, slug, and date are escaped for HTML; content is your post body as HTML.
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
            <code>{'<meta name="blog-editor:title" content="{{title}}" />'}</code> and{' '}
            <code>{'<meta name="blog-editor:excerpt" content="{{excerpt}}" />'}</code> in <code>&lt;head&gt;</code>.
          </p>
        </aside>
      </div>
    </section>
  )
}
