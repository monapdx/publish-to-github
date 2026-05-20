import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POSTS_PATH,
  normalizePostsPathInput,
  postUrlForIndex,
  resolveBlogIndexPath,
  resolvePostsDirectory,
  stylesheetHrefForPost,
} from '../blogPaths'

describe('normalizePostsPathInput', () => {
  it('coerces blog/ to blog/posts/', () => {
    expect(normalizePostsPathInput('blog/')).toBe(DEFAULT_POSTS_PATH)
    expect(normalizePostsPathInput('')).toBe(DEFAULT_POSTS_PATH)
  })
})

describe('resolve paths', () => {
  it('places posts under blog/posts and index at blog/index.html', () => {
    expect(resolvePostsDirectory('blog/posts/')).toBe('blog/posts')
    expect(resolveBlogIndexPath({ postsPath: 'blog/posts/' })).toBe('blog/index.html')
  })
})

describe('postUrlForIndex', () => {
  it('links from blog/index.html to blog/posts/slug.html', () => {
    expect(postUrlForIndex('blog/posts/my-post.html', 'blog/index.html')).toBe(
      'posts/my-post.html',
    )
  })
})

describe('stylesheetHrefForPost', () => {
  it('uses ../style.css from blog/posts/', () => {
    expect(stylesheetHrefForPost('blog/posts/slug.html')).toBe('../style.css')
  })
})
