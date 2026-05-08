# 🧱 Pub2Hub — Neo-Brutalist Blog Editor for GitHub

**Write posts. Click publish. Done.**  
No CMS. No backend. No subscriptions.

👉 Live demo: https://monapdx.github.io/publish-to-github/  
👉 Get it on Gumroad: [Get It Now](https://ashpdx.gumroad.com/l/lvsnmfb)

---

**A browser-based editor that publishes directly to your GitHub repo as HTML files.**

No dashboards.  
No lock-in.  
No middleman.

Just files → in your repo → under your control.

## 👀 Who this is for

You’ll probably like this if you:

- hate CMS platforms  
- prefer files over platforms  
- already use GitHub (or want to)  
- want full control over your content  
- don’t want another subscription  

Not for everyone—and that’s intentional.

## 🚫 What this is NOT

- Not a hosted blogging platform  
- Not beginner-friendly in a hand-holdy way  
- Not trying to replace WordPress  

It’s a **tool**, not a platform.

## What You Actually Get

| 📝 Editor | 🛠️ Toolbar | 📌 Publishing | 📚 Sidebar |
|--------|--------|------------|---------|
| Easy toggle to switch from the visual editor to direct source code editing<br><sub>Main editing interface</sub> | Offers everything you need (images, media upload, tables, links, text formatting, code snippets, and more)<br><sub>Formatting tools</sub> | Click to publish to a specific folder in your repo. it will create the folder if it doesn't already exist<br><sub>Publish to GitHub</sub> | Easily toggle between drafts and published posts in the sidebar<br><sub>Drafts & posts</sub> | |

### Toolbar

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/text-format-zoomed.gif">

- **Visual mode:** [TipTap](https://tiptap.dev/) v3 (ProseMirror) with headings (H1–H3), paragraph, bold, italic, underline, bullet and ordered lists, blockquote, horizontal rule, links, and undo/redo. **Ctrl/Cmd+S** saves the current draft (same as **Save draft**).

- **Code mode:** plain `textarea` for the post body HTML.

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/assets/visual-code-editors.gif" width="732">

- **Tables:** insert a sized table (header row), then add/remove rows and columns or remove the whole table while the cursor is inside the table.

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/assets/insert-table.png">

- **Upload Media:**

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/assets/upload-media.png">

- **Code snippets:** insert a multiline snippet from a dialog; optional language label becomes a `language-*` class on `<code>`. In Visual mode the block is styled with decorative triple-backtick lines; exported HTML is a normal `<pre><code>` block.

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/assets/insert-snippet.png">

- **Images:** paste a URL or upload a file (embedded as a data URL in the draft). Alt text, width, height, and alignment classes (`blog-image align-*`) are supported.

<img src="https://raw.githubusercontent.com/monapdx/publish-to-github/refs/heads/main/assets/insert-image.png">




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

## GitHub token

Use a **fine-grained token** that can **read** repository contents (to list and open published posts) and **write** contents (to publish), scoped to the repo you use. The token is stored in the browser (`localStorage`) after a successful publish, along with the rest of the publish form.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — ESLint

## Why this exists

- No databases
- No dashboards
- No subscriptions
- Just files in your repo

**Write → Save locally → Publish to GitHub**
