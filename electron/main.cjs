/**
 * Electron main process entry point.
 *
 * Responsibilities:
 *   - Create a single BrowserWindow.
 *   - In development (npm run electron-dev), load the Vite dev server URL
 *     supplied via the ELECTRON_START_URL environment variable. This gives
 *     hot reloads while you edit React code.
 *   - In production (the packaged app, or `npm run electron` after a build),
 *     load the static Vite build from ../dist/index.html using file://.
 *   - Force external links (http/https) to open in the user's default
 *     browser instead of a new Electron window.
 *
 * Kept intentionally small and beginner-friendly: no auto-updates, no
 * telemetry, no menu customization. Sensible security defaults are on.
 */

const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

/** Development URL is provided by the `electron-dev` npm script. */
const DEV_URL = process.env.ELECTRON_START_URL

/** Resolved path to the built index.html for production / packaged runs. */
const PROD_INDEX = path.join(__dirname, '..', 'dist', 'index.html')

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#fff7fb',
    title: 'Pub2Hub Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Open http(s) links in the user's default browser rather than a new
  // Electron BrowserWindow. Without this, target="_blank" links would
  // briefly pop up an Electron window with no navigation chrome.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'deny' }
  })

  if (DEV_URL) {
    win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(PROD_INDEX)
  }
}

app.whenReady().then(() => {
  createMainWindow()

  // On macOS it's standard to re-create a window when the dock icon is
  // clicked and no other windows are open. Harmless on Windows/Linux.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Quit when all windows are closed (standard on Windows/Linux).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
