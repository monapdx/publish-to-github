const STORAGE_KEY = 'blog-editor-github-settings'

export function defaultGithubSettings() {
  return {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
  }
}

export function loadGithubSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultGithubSettings()
    const parsed = JSON.parse(raw)
    const merged = { ...defaultGithubSettings(), ...parsed }
    return {
      token: merged.token ?? '',
      owner: merged.owner ?? '',
      repo: merged.repo ?? '',
      branch: merged.branch ?? 'main',
    }
  } catch {
    return defaultGithubSettings()
  }
}

export function persistGithubSettings(settings) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...defaultGithubSettings(), ...settings }),
    )
    return true
  } catch {
    return false
  }
}
