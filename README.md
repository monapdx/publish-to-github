# Blog Editor

Minimal WordPress-style editor for writing HTML posts and publishing full pages to a GitHub repository using the [Contents API](https://docs.github.com/en/rest/repos/contents).

## Features

- TipTap WYSIWYG editing (headings, lists, links, quotes, undo/redo, and more)
- Raw HTML mode (`textarea`)
- Drafts stored in `localStorage`
- Image insertion via URL with alt text, width, height, and alignment classes (`blog-image align-*`)
- Publish generates a standalone HTML file (default path `blog/{slug}.html`)

## Setup

```bash
npm install
npm run dev
```

## GitHub token

Create a **[fine-grained](https://github.com/settings/personal-access-tokens)** or classic PAT with permission to write repository contents. The token is kept in the browser (`localStorage`) after a successful publish.

Fine-grained tokens **--->** Generate new token **--->** Token name **--->** Expiration **--->** No expiration **--->** Repository access **--->** Only select repositories **--->** Select repositories **--->** Permissions **--->** Add permissions **--->** Contents **--->** Access **--->** Read and write **--->** Generate token

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the production build

## Security note

Storing a PAT in `localStorage` is convenient for a personal MVP but is not suitable for shared machines. Treat this app as a personal utility.
