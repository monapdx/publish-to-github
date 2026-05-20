import { MARKER_BLOCK_SNIPPET } from '../lib/blogIndex'

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
          <h2 id="help-title">Getting Started</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="help-panel__body">
          <section className="help-section">
            <h3>What this tool does</h3>
            <p>
              This is a <strong>local post editor</strong> that turns your writing into a normal web page file (HTML)
              and sends it straight to a folder in <strong>your</strong> GitHub project. You stay in control: your words
              live in files you can move, back up, or delete anytime.
            </p>
          </section>

          <section className="help-section">
            <h3>What a repository (“repo”) is</h3>
            <p>
              Think of a GitHub <strong>repository</strong> as a <strong>project folder in the cloud</strong>. It holds
              your site’s files (pages, images, styles). This app needs your <strong>username</strong>, the{' '}
              <strong>repository name</strong>, and a <strong>personal access token</strong> (a private key) so it can
              add or update post files in that folder.
            </p>
          </section>

          <section className="help-section">
            <h3>What GitHub Pages is (optional)</h3>
            <p>
              <strong>GitHub Pages</strong> is a free way GitHub can turn a repository into a simple public website. If
              you turn Pages on for your repo, visitors can read your published HTML posts in a browser. You do not need
              Pages for this editor to work, but many people use them together.
            </p>
          </section>

          <section className="help-section">
            <h3>Blog index page &amp; site layout (Code view)</h3>
            <p>
              In <strong>Code</strong> view, set the <strong>blog index page</strong> path (or paste a GitHub file URL)
              — the HTML file where new posts should appear in a list. Click <strong>Load index &amp; detect layout</strong>{' '}
              to copy your site’s navigation, footer, styles, and listing-card markup into the post template and index
              card template. Published posts then use the same chrome as your index page.
            </p>
            <p>
              After each publish, the app can add a short “post card” block to that index file. It only does this if you
              place two <strong>marker comments</strong> (<code>BLOG_POSTS_START</code> / <code>BLOG_POSTS_END</code>) in
              the HTML — invisible labels that do not show on the public site. New posts are inserted right after the
              start marker (newest first). Use <strong>Edit homepage HTML</strong>{' '}
              to edit the file, check markers, or adjust card HTML.
            </p>
            <pre className="help-marker-snippet">{MARKER_BLOCK_SNIPPET}</pre>
          </section>

          <section className="help-section">
            <h3>How to create a token</h3>
            <ol className="help-list">
              <li>Sign in at github.com.</li>
              <li>
                Open <strong>Settings</strong> → <strong>Developer settings</strong> →{' '}
                <strong>Personal access tokens</strong>.
              </li>
              <li>
                Create a token that can <strong>read and write repository contents</strong> for the repo you use with
                this app. Fine-grained tokens are fine if they include contents read/write for that one repository.
              </li>
              <li>Copy the token once and paste it into this app. GitHub will not show it again.</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>How to add the token here</h3>
            <p>
              On first launch, use the welcome screen. Later, open <strong>Publish</strong> in the top bar. Settings are
              stored in your browser on this computer (not on our servers).
            </p>
          </section>

          <section className="help-section">
            <h3>Publish your first post</h3>
            <ol className="help-list">
              <li>Write a title and your post in the main editor.</li>
              <li>Click <strong>Save draft locally</strong> if you want a backup on this computer.</li>
              <li>
                Click <strong>Publish</strong>, confirm your repo details, then{' '}
                <strong>Publish to GitHub</strong>.
              </li>
              <li>Wait for the success message. Your file appears in the posts folder you configured.</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>Edit a post you already published</h3>
            <p>
              In the sidebar, open the <strong>Published</strong> tab, click your post, edit, then publish again. The
              app updates the same file on GitHub.
            </p>
          </section>

          <section className="help-section">
            <h3>Common mistakes and fixes</h3>
            <ul className="help-list help-list--bullets">
              <li>
                <strong>“Repository not found”</strong> — Check spelling of username and repo name. The repo must
                already exist on GitHub.
              </li>
              <li>
                <strong>Token errors</strong> — Paste the whole token, no spaces. Regenerate the token if it expired.
              </li>
              <li>
                <strong>Empty published list</strong> — Confirm the <strong>posts folder</strong> path matches your
                repo (for example <code>blog/</code>) and that the <strong>branch</strong> is correct (often{' '}
                <code>main</code>).
              </li>
              <li>
                <strong>Need Node.js for the Windows BAT files</strong> — Install Node from nodejs.org (LTS), then run{' '}
                <code>install.bat</code> again.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
