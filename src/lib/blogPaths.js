import { slugify } from './slugify'

export const BLOG_ROOT = 'blog'
export const BLOG_INDEX = 'blog/index.html'
export const BLOG_STYLE = 'blog/style.css'
export const BLOG_NOJEKYLL = 'blog/.nojekyll'
export const BLOG_POSTS = 'blog/posts'
export const BLOG_POSTS_GITKEEP = 'blog/posts/.gitkeep'
export const PAGES_WORKFLOW = '.github/workflows/deploy-blog-pages.yml'
export const POST_STYLESHEET_HREF = '../style.css'

/** href from blog/index.html → blog/posts/slug.html */
export function postHref(slug) {
  return `posts/${slugify(String(slug ?? '').trim()) || 'post'}.html`
}

/** repo path for a post file */
export function postRepoPath(slug) {
  return `${BLOG_POSTS}/${postHref(slug).replace(/^posts\//, '')}`
}
