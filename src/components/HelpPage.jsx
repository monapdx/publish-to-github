import { MARKER_BLOCK_SNIPPET } from '../lib/blogIndex'

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
                <strong>Connect GitHub</strong> — welcome screen or <strong>Publish</strong> (username, repo, token).
              </li>
              <li>
                <strong>Write a post</strong> — title and body in the editor.
              </li>
              <li>
                <strong>Click Publish</strong> — confirm connection, then <strong>Publish to GitHub</strong>.
              </li>
              <li>
                <strong>Enable Pages</strong> (first publish only) — repo <strong>Settings → Pages → GitHub Actions</strong>.
              </li>
              <li>
                <strong>Visit your site</strong> — URL on the Pages settings screen after the deploy workflow runs.
              </li>
            </ol>
          </section>

          <HelpDetails title="Blog structure">
            <pre className="help-tree" aria-label="Blog folder layout">{`blog/
  index.html
  style.css
  posts/
    my-post.html`}</pre>
            <p>
              Posts are saved as normal HTML files and listed automatically on the homepage.
            </p>
          </HelpDetails>

          <HelpDetails title="GitHub token setup">
            <p className="help-lead">Need help creating a token?</p>
            <p>
              <strong>Fine-grained (recommended)</strong> — Settings → Developer settings → Personal access tokens →
              Fine-grained → generate for <strong>only your repo</strong>.
            </p>
            <ul className="help-list help-list--bullets">
              <li>
                <strong>Contents</strong>: Read and write
              </li>
              <li>
                <strong>Metadata</strong>: Read-only
              </li>
              <li>
                <strong>Workflows</strong>: Read and write (so the deploy workflow can be added)
              </li>
            </ul>
            <p>
              <strong>Username</strong> must match the repo owner (your account or the org name, not your personal name
              for an org repo). Paste the token once — no extra spaces.
            </p>
            <p>
              <strong>Classic fallback</strong> — Tokens (classic) with the <strong>repo</strong> scope (<code>ghp_</code>
              ).
            </p>
          </HelpDetails>

          <HelpDetails title="Editing existing posts">
            <ol className="help-list">
              <li>Open the sidebar <strong>Published</strong> tab.</li>
              <li>Select the post to load it.</li>
              <li>Edit title, body, or slug.</li>
              <li>
                <strong>Publish</strong> again — the same file on GitHub is updated.
              </li>
            </ol>
          </HelpDetails>

          <HelpDetails title="Common problems">
            <dl className="help-issues">
              <div>
                <dt>Repository not found</dt>
                <dd>
                  Check username and repo name spelling. The repo must already exist on GitHub.
                </dd>
              </div>
              <div>
                <dt>Token permissions</dt>
                <dd>
                  Use a fresh token with Contents (and Workflows) on this repo. Open <strong>Details</strong> in the
                  Publish dialog for GitHub’s exact error.
                </dd>
              </div>
              <div>
                <dt>Workflow / Pages deployment</dt>
                <dd>
                  After first publish, set Pages source to <strong>GitHub Actions</strong> and run{' '}
                  <strong>Deploy blog to GitHub Pages</strong> under Actions.
                </dd>
              </div>
              <div>
                <dt>Missing homepage markers</dt>
                <dd>
                  Add <code>BLOG_POSTS_START</code> and <code>BLOG_POSTS_END</code> in <code>blog/index.html</code> so
                  new posts appear on the homepage. Use Code view → advanced homepage tools to check.
                </dd>
              </div>
            </dl>
          </HelpDetails>

          <HelpDetails title="Advanced details">
            <p>
              <strong>Marker comments</strong> — invisible HTML comments that tell the app where to insert post cards
              (newest first):
            </p>
            <pre className="help-tree">{MARKER_BLOCK_SNIPPET}</pre>
            <p>
              <strong>Templates</strong> — bundled under <code>templates/</code> (post page, post card, index design).
              Publish uses those files; Code view is for optional customization.
            </p>
            <p>
              <strong>Workflow</strong> — <code>.github/workflows/deploy-blog-pages.yml</code> deploys the{' '}
              <code>blog/</code> folder to GitHub Pages.
            </p>
            <pre className="help-tree" aria-label="Full generated layout">{`blog/
  index.html
  style.css
  .nojekyll
  posts/
    your-slug.html
.github/workflows/deploy-blog-pages.yml`}</pre>
          </HelpDetails>
        </div>
      </div>
    </div>
  )
}
