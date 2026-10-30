import { BLOG_ROOT } from './blogPaths'
import { fetchRepoFileText, getFileSha, upsertFile } from './github'

const ASSET_DIR = `${BLOG_ROOT}/assets`
const IMAGE_TYPES = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  'image/bmp': 'bmp', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
  'image/tiff': 'tif',
}

/** Upload inline images before publishing, preserving their original bytes and format. */
export async function publishImageAssets({ content, path, ...connection }) {
  const doc = new DOMParser().parseFromString(content, 'text/html')
  const images = [...doc.querySelectorAll('img[src]')]
  const uploaded = new Map()
  let changed = false
  for (const image of images) {
    const src = image.getAttribute('src')
    if (!/^data:image\//i.test(src)) continue
    let assetPath = uploaded.get(src)
    if (!assetPath) {
      const match = /^data:(image\/[^;,]+)(;base64)?,([\s\S]*)$/i.exec(src)
      const type = match?.[1].toLowerCase()
      const ext = IMAGE_TYPES[type]
      if (!match || !ext) throw new Error('This uploaded image format is not supported. Use PNG, JPEG, GIF, WebP, SVG, or AVIF.')
      let bytes
      try {
        bytes = match[2]
          ? Uint8Array.from(atob(match[3].replace(/\s/g, '')), (c) => c.charCodeAt(0))
          : new TextEncoder().encode(decodeURIComponent(match[3]))
      } catch {
        throw new Error('An uploaded image could not be decoded. Remove it and upload it again.')
      }
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
      assetPath = `${ASSET_DIR}/${hash}.${ext}`
      const sha = await getFileSha({ ...connection, path: assetPath })
      if (!sha) {
        let binary = ''
        for (const byte of bytes) binary += String.fromCharCode(byte)
        await upsertFile({ ...connection, path: assetPath, content: btoa(binary), encoding: 'base64',
          message: `Upload image: ${hash}.${ext}` })
      }
      uploaded.set(src, assetPath)
    }
    const depth = path.split('/').length - 2
    image.setAttribute('src', `${'../'.repeat(depth)}assets/${assetPath.split('/').pop()}`)
    changed = true
  }
  return changed ? doc.body.innerHTML : content
}

/** Restore repo image links as local draft data so private-repo images also display. */
export async function loadPublishedImageAssets({ content, path, ...connection }) {
  const doc = new DOMParser().parseFromString(content, 'text/html')
  const images = [...doc.querySelectorAll('img[src]')]
  const loaded = new Map()
  let changed = false
  for (const image of images) {
    const src = image.getAttribute('src')
    if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(src)) continue
    const assetPath = new URL(src, `https://repo.invalid/${path}`).pathname.slice(1)
    if (!assetPath.startsWith(`${ASSET_DIR}/`)) continue
    const ext = assetPath.split('.').pop().toLowerCase()
    const type = Object.keys(IMAGE_TYPES).find((mime) => IMAGE_TYPES[mime] === ext)
    if (!type) continue
    if (!loaded.has(assetPath)) {
      const result = await fetchRepoFileText({ ...connection, path: assetPath, encoding: 'base64' })
      loaded.set(assetPath, `data:${type};base64,${result.text}`)
    }
    image.setAttribute('src', loaded.get(assetPath))
    changed = true
  }
  return changed ? doc.body.innerHTML : content
}
