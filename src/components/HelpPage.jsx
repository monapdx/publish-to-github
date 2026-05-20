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
            <h3>GitHub Pages (assumes you have not set it up yet)</h3>
            <p>
              <strong>GitHub Pages</strong> turns your repository into a public website. This app assumes Pages is{' '}
              <strong>not</strong> configured yet. On first publish it adds{' '}
              <code>.github/workflows/deploy-blog-pages.yml</code>, which deploys the entire <code>blog/</code> folder so{' '}
              <code>blog/index.html</code> becomes your site homepage.
            </p>
            <p>
              <strong>One-time after the first publish:</strong> open your repo on GitHub → <strong>Settings</strong> →{' '}
              <strong>Pages</strong> → under <strong>Build and deployment</strong>, set <strong>Source</strong> to{' '}
              <strong>GitHub Actions</strong> (not “Deploy from a branch”). Then open the <strong>Actions</strong> tab and
              run or re-run <strong>Deploy blog to GitHub Pages</strong>. Your site URL appears on the Pages settings
              screen once the workflow succeeds.
            </p>
          </section>

          <section className="help-section">
            <h3>Blog folder bootstrap</h3>
            <p>
              On first publish, the app copies starter files from its read-only <code>templates/</code> folder into your
              repo’s <code>blog/</code> directory: <code>index.html</code> (from <code>templates/index.html</code>),{' '}
              <code>style.css</code>, <code>posts/</code> (for published HTML files), and <code>.nojekyll</code> if those
              are missing. It does <strong>not</strong> upload a <code>blog/templates/</code> folder. Each post is
              generated from <code>post-page-template.html</code>; the index listing uses{' '}
              <code>post-card-template.html</code>.
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
            <h3>Fine-grained token (recommended checklist)</h3>
            <ol className="help-list">
              <li>
                GitHub → your profile <strong>Settings</strong> → <strong>Developer settings</strong> →{' '}
                <strong>Personal access tokens</strong> → <strong>Fine-grained tokens</strong> →{' '}
                <strong>Generate new token</strong>.
              </li>
              <li>
                <strong>Resource owner</strong> — pick your user account, or the <strong>organization</strong> if the
                repo lives under an org.
              </li>
              <li>
                <strong>Repository access</strong> — choose <strong>Only select repositories</strong> and select the
                exact repo you type in this app (not “All repositories” unless you intend that).
              </li>
              <li>
                <strong>Permissions → Repository permissions</strong>:
                <ul className="help-list help-list--bullets">
                  <li>
                    <strong>Contents</strong>: Access <strong>Read and write</strong> (required to publish posts and
                    blog files)
                  </li>
                  <li>
                    <strong>Metadata</strong>: Access <strong>Read-only</strong> (usually required to open the repo)
                  </li>
                  <li>
                    <strong>Workflows</strong>: Access <strong>Read and write</strong> (required for the app to add{' '}
                    <code>.github/workflows/deploy-blog-pages.yml</code> automatically)
                  </li>
                </ul>
              </li>
              <li>
                If your token can limit branches, allow the branch you enter here (often <code>main</code>).
              </li>
              <li>
                Copy the token once (it starts with <code>github_pat_</code>) and paste it with no extra spaces. GitHub
                will not show it again.
              </li>
            </ol>
            <p>
              <strong>GitHub username</strong> in this app must match the repo owner: your username for personal repos,
              or the <strong>organization name</strong> for org repos (not your personal username if the repo is under an
              org).
            </p>
          </section>

          <section className="help-section">
            <h3>Classic token (alternative)</h3>
            <p>
              Developer settings → Personal access tokens → <strong>Tokens (classic)</strong> → generate with scope{' '}
              <strong>repo</strong> (full control of private repositories). Paste the <code>ghp_</code> token here.
            </p>
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
                <strong>Token errors (401 / 403)</strong> — Paste the whole token with no spaces. For fine-grained tokens,
                confirm <strong>Contents: Read and write</strong> on the <em>same</em> repository, correct{' '}
                <strong>owner</strong> (org vs user), and branch name. Open the error “Details” in the Publish dialog for
                GitHub’s exact message.
              </li>
              <li>
                <strong>Empty published list</strong> — Confirm the <strong>posts folder</strong> path matches your
                repo (for example <code>blog/posts/</code>) and that the <strong>branch</strong> is correct (often{' '}
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
