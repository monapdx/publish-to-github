/**
 * Electron preload script.
 *
 * Currently a no-op: the renderer is a pure React/Vite web app and does
 * not need any Node APIs exposed. Keeping this file (and the corresponding
 * `webPreferences.preload` reference in main.cjs) makes it trivial to
 * expose a tiny, vetted bridge later via `contextBridge.exposeInMainWorld`
 * without changing the window setup.
 */
