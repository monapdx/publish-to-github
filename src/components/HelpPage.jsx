function HelpDetails({ title, children, defaultOpen = false }) {
  return (
    <details className="help-details" open={defaultOpen || undefined}>
      <summary className="help-details__summary">{title}</summary>
      <div className="help-details__body">{children}</div>
    </details>
  )
}

export function HelpPage({ open, onClose }) {
  if (!open) return null

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <div className="help-panel__header">
          <h2 id="help-title">Help</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="help-panel__body">
          <section className="help-quick" aria-labelledby="help-quick-title">
            <h3 id="help-quick-title" className="help-quick__title">
              Quick start
            </h3>
            <ol className="help-checklist">
              <li>
                <strong>Write a post</strong> — add a title and body in Visual or Code mode.
              </li>
              <li>
                <strong>Save draft</strong> — keeps a local backup in this browser (<strong>Ctrl/Cmd+S</strong> works
                too). Open drafts are autosaved after a short pause.
              </li>
              <li>
                <strong>Export draft</strong> — downloads a Markdown file with <code>status: draft</code> in the
                frontmatter.
              </li>
              <li>
                <strong>Export final</strong> — downloads clean Markdown and stores a copy under the{' '}
                <strong>Finals</strong> sidebar tab.
              </li>
            </ol>
          </section>

          <HelpDetails title="Markdown export">
            <p>
              Exports include YAML frontmatter (title, slug, excerpt, category, status, updated date) followed by the
              post body converted from HTML.
            </p>
            <p>
              Draft files are named like <code>my-post-draft.md</code>. Final files use <code>my-post.md</code>.
            </p>
          </HelpDetails>

          <HelpDetails title="Visual and Code modes">
            <p>
              <strong>Visual</strong> uses TipTap for headings, lists, links, images, tables, and code blocks.{' '}
              <strong>Code</strong> edits the raw HTML for the post body.
            </p>
          </HelpDetails>

          <HelpDetails title="Where data lives">
            <p>
              Drafts and final versions are stored in <strong>localStorage</strong> on this computer only. Nothing is
              sent to a server unless you share the exported files yourself.
            </p>
            <p>
              Clearing site data in your browser removes local drafts and finals. Export Markdown copies you want to
              keep.
            </p>
          </HelpDetails>

          <HelpDetails title="Keyboard shortcuts">
            <ul className="help-list help-list--bullets">
              <li>
                <strong>Ctrl/Cmd+S</strong> — save draft locally
              </li>
            </ul>
          </HelpDetails>
        </div>
      </div>
    </div>
  )
}
