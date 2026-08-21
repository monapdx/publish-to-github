import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

turndown.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement(content) {
    return ` ${content.trim()} |`
  },
})

turndown.addRule('tableRow', {
  filter: 'tr',
  replacement(content, node) {
    const cells = Array.from(node.children)
      .map((cell) => turndown.turndown(cell.innerHTML).replace(/\|/g, '\\|').trim())
      .join(' | ')
    return `| ${cells} |\n`
  },
})

turndown.addRule('table', {
  filter: 'table',
  replacement(content) {
    const lines = content.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return ''
    const colCount = (lines[0].match(/\|/g) || []).length - 1
    const separator = `| ${Array(colCount).fill('---').join(' | ')} |`
    return [lines[0], separator, ...lines.slice(1)].join('\n') + '\n\n'
  },
})

function escapeYaml(value) {
  const text = String(value ?? '').trim()
  if (!text) return '""'
  if (/[:#\n\r"'\\]/.test(text)) return JSON.stringify(text)
  return text
}

/**
 * @param {string} html
 */
export function htmlToMarkdown(html) {
  const trimmed = String(html || '').trim()
  if (!trimmed || trimmed === '<p></p>') return ''
  return turndown.turndown(trimmed).trim()
}

/**
 * @param {{
 *   title: string,
 *   slug: string,
 *   excerpt?: string,
 *   category?: string,
 *   content: string,
 *   status: 'draft' | 'final',
 *   updatedAt?: string,
 * }} post
 */
export function buildMarkdownDocument(post) {
  const title = post.title?.trim() || 'Untitled'
  const slug = post.slug?.trim() || 'untitled'
  const excerpt = post.excerpt?.trim() || ''
  const category = post.category?.trim() || ''
  const updatedAt = post.updatedAt || new Date().toISOString()
  const body = htmlToMarkdown(post.content)

  const frontmatter = [
    '---',
    `title: ${escapeYaml(title)}`,
    `slug: ${escapeYaml(slug)}`,
    excerpt ? `excerpt: ${escapeYaml(excerpt)}` : null,
    category ? `category: ${escapeYaml(category)}` : null,
    `status: ${post.status}`,
    `updated: ${updatedAt}`,
    '---',
  ]
    .filter(Boolean)
    .join('\n')

  const sections = [frontmatter, '', `# ${title}`, '']
  if (body) sections.push(body)
  return sections.join('\n').trimEnd() + '\n'
}

/**
 * @param {string} filename
 * @param {string} text
 */
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function safeFilenamePart(value) {
  return String(value || 'untitled')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled'
}

/**
 * @param {{ slug: string, status: 'draft' | 'final' }} input
 */
export function markdownFilename({ slug, status }) {
  const base = safeFilenamePart(slug)
  return status === 'draft' ? `${base}-draft.md` : `${base}.md`
}
