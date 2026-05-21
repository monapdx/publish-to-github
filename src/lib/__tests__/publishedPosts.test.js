import { describe, expect, it } from 'vitest'
import {
  buildOptimisticPublishedFile,
  filterVisiblePublishedPosts,
  pruneRecentlyDeletedSlugs,
  publishedFileSlug,
  upsertPublishedPost,
  withoutDeletedPost,
} from '../publishedPosts'

describe('publishedPosts helpers', () => {
  const posts = [
    { name: 'keep.html', path: 'blog/posts/keep.html' },
    { name: 'gone.html', path: 'blog/posts/gone.html' },
  ]

  it('publishedFileSlug strips .html', () => {
    expect(publishedFileSlug({ name: 'my-post.html' })).toBe('my-post')
  })

  it('withoutDeletedPost removes by slug and path', () => {
    const next = withoutDeletedPost(posts, {
      slug: 'gone',
      path: 'blog/posts/gone.html',
      href: 'posts/gone.html',
    })
    expect(next).toHaveLength(1)
    expect(next[0].name).toBe('keep.html')
  })

  it('filterVisiblePublishedPosts hides recently deleted slugs', () => {
    const visible = filterVisiblePublishedPosts(posts, ['gone'])
    expect(visible.map((p) => p.name)).toEqual(['keep.html'])
  })

  it('upsertPublishedPost replaces same slug and prepends', () => {
    const existing = [{ name: 'old.html', path: 'blog/posts/old.html', slug: 'old' }]
    const item = buildOptimisticPublishedFile({
      slug: 'new',
      title: 'New',
      path: 'blog/posts/new.html',
    })
    const next = upsertPublishedPost(existing, item)
    expect(next).toHaveLength(2)
    expect(next[0].slug).toBe('new')
    const updated = buildOptimisticPublishedFile({
      slug: 'old',
      title: 'Old revised',
      path: 'blog/posts/old.html',
    })
    const next2 = upsertPublishedPost(next, updated)
    expect(next2).toHaveLength(2)
    expect(next2[0].title).toBe('Old revised')
  })

  it('pruneRecentlyDeletedSlugs drops slug when file is gone from repo list', () => {
    expect(pruneRecentlyDeletedSlugs(['gone', 'ghost'], [{ name: 'gone.html', path: 'blog/posts/gone.html' }])).toEqual([
      'gone',
    ])
    expect(pruneRecentlyDeletedSlugs(['gone'], [{ name: 'keep.html', path: 'blog/posts/keep.html' }])).toEqual([])
  })
})
