const STORAGE_KEY = 'blog-editor-custom-stylesheets'

export function parseStylesheetUrls(input) {
  return String(input ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((href) => {
    if (/["'<>]/.test(href) || [...href].some((char) => char.charCodeAt(0) < 32) ||
        /^(?:data|file|blob):/i.test(href) || /^(?:[a-z][a-z\d+.-]*:)/i.test(href) && !/^https?:\/\//i.test(href) ||
        href.startsWith('//')) {
      throw new Error(`Invalid stylesheet URL: ${href}`)
    }
    return href
  })
}

export function addStylesheets(html, input) {
  const urls = parseStylesheetUrls(input)
  if (!urls.length) return html
  if (!/<\/head\s*>/i.test(html)) throw new Error('The post template needs a closing </head> tag.')
  const links = urls.map((href) => `<link rel="stylesheet" href="${href.replaceAll('&', '&amp;')}" />`).join('\n    ')
  return html.replace(/<\/head\s*>/i, `    ${links}\n  </head>`)
}

export function loadCustomStylesheets() {
  try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
}

export function persistCustomStylesheets(value) {
  try { localStorage.setItem(STORAGE_KEY, value) } catch { /* storage unavailable */ }
}
