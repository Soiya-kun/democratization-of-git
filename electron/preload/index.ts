import { contextBridge, ipcRenderer } from 'electron'
import type { AppCommand, DiffRequest, PreloadApi } from '../../shared/ipc'

const api: PreloadApi = {
  getState: () => ipcRenderer.invoke('app:get-state'),
  selectFolder: () => ipcRenderer.invoke('app:select-folder'),
  runCommand: (command: AppCommand) => ipcRenderer.invoke('app:command', command),
  getDiff: (request: DiffRequest) => ipcRenderer.invoke('app:get-diff', request),
  onWorkspaceChanged: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('workspace:changed', listener)
    return () => ipcRenderer.removeListener('workspace:changed', listener)
  },
  createTerminal: (id: string) => ipcRenderer.invoke('terminal:create', id),
  sendTerminalInput: (payload) => ipcRenderer.invoke('terminal:input', payload),
  resizeTerminal: (payload) => ipcRenderer.invoke('terminal:resize', payload),
  closeTerminal: (id: string) => ipcRenderer.invoke('terminal:close', id),
  onTerminalData: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { id: string; data: string }) => callback(payload)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
