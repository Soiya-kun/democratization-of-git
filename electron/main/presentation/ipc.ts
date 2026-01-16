import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { AppCommand, ApiResult, AppState, DiffRequest, DiffResult } from '../../../shared/ipc'
import { ApplicationError, DomainError } from '../domain/errors'
import { WorkspaceService } from '../application/workspace-service'

const toApiError = (error: unknown): ApiResult<never> => {
  if (error instanceof DomainError || error instanceof ApplicationError) {
    return { ok: false, error: { code: error.code, message: error.message } }
  }
  if (error instanceof Error) {
    return { ok: false, error: { code: 'unknown', message: error.message } }
  }
  return { ok: false, error: { code: 'unknown', message: '不明なエラーが発生しました。' } }
}

export const registerIpcHandlers = (workspaceService: WorkspaceService) => {
  ipcMain.handle('app:get-state', async (): Promise<ApiResult<AppState>> => {
    try {
      const state = await workspaceService.getAppState()
      return { ok: true, data: state }
    } catch (error) {
      return toApiError(error)
    }
  })

  ipcMain.handle('app:select-folder', async (): Promise<ApiResult<string | null>> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { ok: true, data: null }
      }
      return { ok: true, data: result.filePaths[0] }
    } catch (error) {
      return toApiError(error)
    }
  })

  ipcMain.handle('app:command', async (_event, command: AppCommand): Promise<ApiResult<AppState>> => {
    try {
      const state = await workspaceService.runCommand(command)
      return { ok: true, data: state }
    } catch (error) {
      return toApiError(error)
    }
  })

  ipcMain.handle('app:get-diff', async (_event, request: DiffRequest): Promise<ApiResult<DiffResult>> => {
    try {
      const diff = await workspaceService.getDiff(request)
      return { ok: true, data: diff }
    } catch (error) {
      return toApiError(error)
    }
  })

  workspaceService.on('changed', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('workspace:changed')
    })
  })
}
