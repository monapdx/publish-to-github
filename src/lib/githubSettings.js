const STORAGE_KEY = 'blog-editor-github-settings'

export function defaultGithubSettings() {
  return {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    postsPath: 'blog/',
  }
}

export function loadGithubSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultGithubSettings()
    const parsed = JSON.parse(raw)
    return { ...defaultGithubSettings(), ...parsed }
  } catch {
    return defaultGithubSettings()
  }
}

export function persistGithubSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
