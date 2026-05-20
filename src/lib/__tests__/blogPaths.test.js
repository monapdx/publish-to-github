import { describe, expect, it } from 'vitest'
import { BLOG_INDEX, BLOG_POSTS, POST_STYLESHEET_HREF, postHref, postRepoPath } from '../blogPaths'

describe('blogPaths', () => {
  it('uses the fixed blog layout', () => {
    expect(BLOG_INDEX).toBe('blog/index.html')
    expect(BLOG_POSTS).toBe('blog/posts')
    expect(postRepoPath('hello-world')).toBe('blog/posts/hello-world.html')
    expect(postHref('hello-world')).toBe('posts/hello-world.html')
    expect(POST_STYLESHEET_HREF).toBe('../style.css')
  })
})
