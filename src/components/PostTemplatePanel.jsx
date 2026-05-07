import { DEFAULT_POST_TEMPLATE_HTML, persistPostTemplate } from '../lib/postTemplate'
import { serializePost } from '../lib/postSerializer'

export function PostTemplatePanel({
  html,
  onHtmlChange,
  previewContext,
  onPreviewBlocked,
  onTemplateSaved,
}) {
  function handleReset() {
    onHtmlChange(DEFAULT_POST_TEMPLATE_HTML)
    persistPostTemplate(DEFAULT_POST_TEMPLATE_HTML)
    onTemplateSaved?.('Restored default template.')
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
          Paste or edit a complete HTML page: site navigation, footer, linked CSS/JS, then keep{' '}
          <code>{'{{content}}'}</code> where the post body should appear. Saved locally and used on every
          publish (Code view only).
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
            <button type="button" className="btn btn--sky" onClick={handleSaveTemplate}>
              Save template
            </button>
            <button type="button" className="btn btn--primary" onClick={handlePreview}>
              Preview Template Output
            </button>
          </div>
        </div>

        <aside id="post-template-help" className="post-template__help">
          <h3 className="post-template__help-title">Navigation &amp; footer</h3>
          <p className="post-template__help-intro">
            Paste any HTML you use across the site—e.g. <code>&lt;nav&gt;…&lt;/nav&gt;</code>,{' '}
            <code>&lt;header&gt;…&lt;/header&gt;</code>, <code>&lt;footer&gt;…&lt;/footer&gt;</code>. Wrap your post
            area with <code>&lt;main&gt;</code> or similar and leave{' '}
            <code>{'{{content}}'}</code> inside <code>&lt;article&gt;</code> (or one wrapper) so the editor output
            appears there when published.
          </p>
          <h3 className="post-template__help-title post-template__help-title--sub">Placeholders</h3>
          <p className="post-template__help-intro">
            Title, excerpt, slug, and date are escaped for HTML; <code>{'{{content}}'}</code> is raw HTML from the
            editor.
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
