/** Matches leftover {{PLACEHOLDER}} tokens in rendered HTML. */
export const UNREPLACED_PLACEHOLDER_RE = /\{\{[^}]+\}\}/

export function hasUnreplacedPlaceholders(html) {
  return UNREPLACED_PLACEHOLDER_RE.test(String(html ?? ''))
}
