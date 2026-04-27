# Blog Editor

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/editor.png">

A small, browser-only app for drafting HTML posts and publishing **standalone HTML pages** to a GitHub repository via the [Contents API](https://docs.github.com/en/rest/repos/contents). Think of it as a personal utility: write in a rich editor or raw HTML, keep drafts locally, and push files into a folder you choose (for example `blog/`).

## Features

### Editing

- **Visual** mode: [TipTap](https://tiptap.dev/) v3 (ProseMirror) with headings (H1–H3), paragraph, bold, italic, underline, bullet and ordered lists, blockquote, horizontal rule, links, and undo/redo. **Ctrl/Cmd+S** saves the current draft (same as **Save draft**).
- **Code** mode: plain `textarea` for the post body HTML.
- **Tables**: insert a sized table (header row), then add/remove rows and columns or remove the whole table while the cursor is inside the table.
- **Code snippets**: insert a multiline snippet from a dialog; optional language label becomes a `language-*` class on `<code>`. In Visual mode the block is styled with decorative triple-backtick lines; exported HTML is a normal `<pre><code>` block.
- **Images**: paste a URL or upload a file (embedded as a data URL in the draft). Alt text, width, height, and alignment classes (`blog-image align-*`) are supported.

### Sidebar

- Switch between **Drafts** (local) and **Published** (files in your configured **Posts folder** on GitHub).
- **Drafts**: create, open, delete; **Save draft** in the header (open drafts also autosave after a short idle delay).
- **Published**: requires owner, repo, and token in **Publish**; lists `.html` files in the posts path, refresh, and open a file into the editor. Title, excerpt (when present in the file), and body are parsed from the page; `blog-editor:title` / `blog-editor:excerpt` meta tags are used when present for a reliable round-trip after you publish from this app.

### Publishing

- **Publish** opens a dialog: personal access token, owner, repository, branch, **posts folder** path, and HTML template (**full page with site CSS** or **full page with inline styles**).
- Builds `blog/{slug}.html` (or your custom folder + slug) as a complete document and creates or updates the file on the branch.
- **Excerpt** is stored in published HTML (meta tags) when you fill it in; it is included in new publishes alongside title and body.
- Settings are persisted in `localStorage` after a successful publish.

### Stack

- React 19, Vite 8, ESLint 9
- TipTap extensions: StarterKit (minus bundled link, replaced), Link, Underline, Image, Placeholder, Table (+ row / cell / header)

## Setup

```bash
npm install
npm run dev
```

## GitHub Pages demo

The app is a static SPA. On **project** pages the site URL includes the repo name (`https://<user>.github.io/<repo>/`), so the production build must set Vite’s [`base`](https://vite.dev/config/shared-options.html#base) to that path (this repo reads **`VITE_BASE`** at build time).

### Option A — GitHub Actions (recommended)

1. Push this repo (including `.github/workflows/github-pages.yml`) to GitHub.
2. **Settings → Pages**: under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Push to `main` or `master`, or run the workflow manually (**Actions → Deploy to GitHub Pages → Run workflow**).
4. After it finishes, open the URL shown on the run (for a normal repo it is `https://<owner>.github.io/<repo>/`).

The workflow sets `VITE_BASE` to `/` when the repository is the special **`<user>.github.io`** user-site repo; otherwise it uses `/<repo>/`.

### Option B — Manual build

From the repo root, use the same path your site will use (leading and trailing slashes as shown):

```bash
# Example: repo named publish-to-github → site is https://you.github.io/publish-to-github/
VITE_BASE=/publish-to-github/ npm run build
```

Upload the contents of **`dist/`** to your Pages branch or hosting bucket. On Windows PowerShell:

```powershell
$env:VITE_BASE = "/publish-to-github/"
npm run build
```

For a **user or organization** site served from the root of `https://username.github.io/`, omit `VITE_BASE` (defaults to `/`).

## GitHub token

Use a fine-grained or classic PAT that can **read** repository contents (to list and open published posts) and **write** contents (to publish). Prefer a fine-grained token scoped to the repo you use. The token is stored in the browser (`localStorage`) after a successful publish, along with the rest of the publish form.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

## Security note

Keeping a PAT in `localStorage` is convenient for a personal MVP but is **not** appropriate for shared or untrusted machines. Anyone with access to the browser profile can read it. Treat the app as a personal utility, not a multi-user product.
