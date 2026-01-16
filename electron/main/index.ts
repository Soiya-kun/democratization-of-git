import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SettingsStore } from './infrastructure/settings/settings-store'
import { WorkspaceService } from './application/workspace-service'
import { registerIpcHandlers } from './presentation/ipc'
import { TerminalManager } from './infrastructure/terminal/terminal-manager'

const __dirname = dirname(fileURLToPath(import.meta.url))

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const settingsStore = new SettingsStore()
const workspaceService = new WorkspaceService(settingsStore)
const terminalManager = new TerminalManager()

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers(workspaceService)

  terminalManager.onData((payload) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('terminal:data', payload)
    })
  })

  ipcMain.handle('terminal:create', async (_event, id: string) => {
    const state = await workspaceService.getAppState()
    const cwd =
      state.workspace.kind === 'ready' || state.workspace.kind === 'needs-init'
        ? state.workspace.path
        : process.cwd()
    terminalManager.createTerminal(id, cwd)
  })

  ipcMain.handle('terminal:input', (_event, payload: { id: string; data: string }) => {
    terminalManager.write(payload)
  })

  ipcMain.handle('terminal:resize', (_event, payload: { id: string; cols: number; rows: number }) => {
    terminalManager.resize(payload)
  })

  ipcMain.handle('terminal:close', (_event, id: string) => {
    terminalManager.close(id)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
