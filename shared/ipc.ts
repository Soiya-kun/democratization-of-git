export type ApiError = {
  code: string
  message: string
  details?: string
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export type SettingsState = {
  userName: string | null
  userEmail: string | null
  recentWorkspaces: string[]
}

export type WorkspaceState =
  | { kind: 'empty' }
  | { kind: 'git-missing' }
  | { kind: 'needs-init'; path: string }
  | { kind: 'no-main'; path: string }
  | {
      kind: 'ready'
      path: string
      mode: 'main' | 'work'
      isManaged: boolean
      work: WorkInfo | null
      workCandidates: WorkInfo[]
      changes: ChangeSummary
      mainDirty: boolean
    }
  | {
      kind: 'error'
      path?: string
      message: string
      action?: 'force-main'
    }

export type AppState = {
  settings: SettingsState
  workspace: WorkspaceState
}

export type WorkInfo = {
  branch: string
  name: string
  updatedAt?: string
}

export type ChangeFile = {
  path: string
  staged: boolean
  unstaged: boolean
  untracked: boolean
  conflicted: boolean
  renamedFrom?: string
}

export type ChangeSummary = {
  staged: ChangeFile[]
  unstaged: ChangeFile[]
  untracked: ChangeFile[]
  conflicted: ChangeFile[]
}

export type DiffMode = 'staged' | 'unstaged' | 'untracked'

export type DiffRequest = {
  path: string
  mode: DiffMode
}

export type DiffResult =
  | { kind: 'text'; text: string }
  | { kind: 'binary'; message: string }
  | { kind: 'too-large'; message: string }
  | { kind: 'not-found'; message: string }

export type AppCommand =
  | { type: 'open-folder'; path: string }
  | { type: 'initialize-project' }
  | { type: 'start-work'; name: string }
  | { type: 'resume-work' }
  | { type: 'reset-main' }
  | { type: 'force-main' }
  | { type: 'stage'; paths: string[] }
  | { type: 'unstage'; paths: string[] }
  | { type: 'discard'; paths: string[] }
  | { type: 'discard-all' }
  | { type: 'save-history'; message?: string }
  | { type: 'complete-work' }
  | { type: 'update-settings'; settings: { userName: string; userEmail: string } }
  | { type: 'refresh' }

export type TerminalPayload = {
  id: string
  data: string
}

export type TerminalResizePayload = {
  id: string
  cols: number
  rows: number
}

export type PreloadApi = {
  getState: () => Promise<ApiResult<AppState>>
  selectFolder: () => Promise<ApiResult<string | null>>
  runCommand: (command: AppCommand) => Promise<ApiResult<AppState>>
  getDiff: (request: DiffRequest) => Promise<ApiResult<DiffResult>>
  onWorkspaceChanged: (callback: () => void) => () => void
  createTerminal: (id: string) => Promise<void>
  sendTerminalInput: (payload: TerminalPayload) => Promise<void>
  resizeTerminal: (payload: TerminalResizePayload) => Promise<void>
  closeTerminal: (id: string) => Promise<void>
  onTerminalData: (callback: (payload: TerminalPayload) => void) => () => void
}
