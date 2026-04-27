import { applyTemplate } from './templates'

/**
 * Build the final publishable HTML document.
 * @param {{ title: string, content: string, templateId?: string }} input
 */
export function serializePost({ title, content, templateId = 'default' }) {
  return applyTemplate(templateId, { title, content })
}
