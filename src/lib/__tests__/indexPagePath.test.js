import { describe, expect, it } from 'vitest'
import { normalizeIndexPagePath, resolveIndexPath } from '../indexPagePath'

describe('normalizeIndexPagePath', () => {
  it('uses posts folder default when empty', () => {
    expect(normalizeIndexPagePath('', 'blog/')).toBe('blog/index.html')
  })

  it('parses github blob URLs', () => {
    expect(
      normalizeIndexPagePath(
        'https://github.com/octo/repo/blob/main/blog/index.html',
        'blog/',
      ),
    ).toBe('blog/index.html')
  })
})

describe('resolveIndexPath', () => {
  it('prefers custom indexPagePath', () => {
    expect(resolveIndexPath({ postsPath: 'blog/', indexPagePath: 'pages/blog.html' })).toBe(
      'pages/blog.html',
    )
  })
})
