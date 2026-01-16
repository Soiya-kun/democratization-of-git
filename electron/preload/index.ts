import { contextBridge, ipcRenderer } from 'electron'

const api = {
  gitStatus: () => ipcRenderer.invoke('git:status'),
  gitDiff: (filePath: string) => ipcRenderer.invoke('git:diff', filePath),
  createShell: (id: string) => ipcRenderer.invoke('shell:create', id),
  sendShellInput: (payload: { id: string; data: string }) => ipcRenderer.invoke('shell:input', payload),
  resizeShell: (payload: { id: string; cols: number; rows: number }) =>
    ipcRenderer.invoke('shell:resize', payload),
  closeShell: (id: string) => ipcRenderer.invoke('shell:close', id),
  onShellData: (callback: (payload: { id: string; data: string }) => void) => {
    ipcRenderer.on('shell:data', (_event, payload) => callback(payload))
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
