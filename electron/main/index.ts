import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { platform } from 'node:process'
import { spawn } from 'node-pty'
import { simpleGit } from 'simple-git'

const terminals = new Map<string, ReturnType<typeof spawn>>()

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

app.whenReady().then(() => {
  createWindow()

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

const repoPath = process.cwd()
const git = simpleGit({ baseDir: repoPath })

ipcMain.handle('git:status', async () => {
  const status = await git.status()
  return {
    current: status.current,
    files: status.files
  }
})

ipcMain.handle('git:diff', async (_event, filePath: string) => {
  return git.diff([filePath])
})

ipcMain.handle('shell:create', (_event, id: string) => {
  const shell = platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
  const terminal = spawn(shell, [], {
    cols: 80,
    rows: 24,
    cwd: repoPath,
    env: process.env
  })

  terminals.set(id, terminal)

  terminal.onData((data) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('shell:data', { id, data })
    })
  })

  terminal.onExit(() => {
    terminals.delete(id)
  })
})

ipcMain.handle('shell:input', (_event, { id, data }: { id: string; data: string }) => {
  const terminal = terminals.get(id)
  terminal?.write(data)
})

ipcMain.handle('shell:resize', (_event, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  const terminal = terminals.get(id)
  terminal?.resize(cols, rows)
})

ipcMain.handle('shell:close', (_event, id: string) => {
  const terminal = terminals.get(id)
  terminal?.kill()
  terminals.delete(id)
})
