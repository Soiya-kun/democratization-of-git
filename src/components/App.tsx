import { useEffect, useMemo, useState } from 'react'
import type { AppCommand, AppState, DiffResult } from '../../shared/ipc'
import { ActivityBar } from './ActivityBar'
import { WorkView } from './WorkView'
import { TerminalPanel } from './TerminalPanel'
import { SettingsView } from './SettingsView'

type View = 'work' | 'terminal' | 'settings'
type SelectedFile = { path: string; mode: 'staged' | 'unstaged' | 'untracked' }

export const App = () => {
  const [view, setView] = useState<View>('work')
  const [appState, setAppState] = useState<AppState | null>(null)
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isWebPreview = !window.api

  const workspaceReady = appState?.workspace.kind === 'ready'
  const terminalEnabled = workspaceReady || appState?.workspace.kind === 'needs-init'

  const runCommand = async (command: AppCommand) => {
    if (!window.api) {
      return
    }
    const result = await window.api.runCommand(command)
    if (result.ok) {
      setAppState(result.data)
      setErrorMessage(null)
    } else {
      setErrorMessage(result.error.message)
      if (result.error.code === 'settings-required') {
        setView('settings')
      }
    }
  }

  const refreshState = async () => {
    if (!window.api) {
      return
    }
    const result = await window.api.getState()
    if (result.ok) {
      setAppState(result.data)
      setErrorMessage(null)
    } else {
      setErrorMessage(result.error.message)
    }
  }

  useEffect(() => {
    void refreshState()
  }, [])

  useEffect(() => {
    if (!window.api) {
      return
    }
    const unsubscribe = window.api.onWorkspaceChanged(() => {
      void refreshState()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!window.api || !selectedFile) {
      setDiffResult(null)
      return
    }
    setDiffResult(null)
    const fetchDiff = async () => {
      const result = await window.api.getDiff({ path: selectedFile.path, mode: selectedFile.mode })
      if (result.ok) {
        setDiffResult(result.data)
      } else {
        setDiffResult({ kind: 'not-found', message: result.error.message })
      }
    }
    void fetchDiff()
  }, [selectedFile])

  useEffect(() => {
    if (!appState || appState.workspace.kind !== 'ready') {
      setSelectedFile(null)
      setDiffResult(null)
      return
    }
    if (selectedFile) {
      const paths = new Set(
        [
          ...appState.workspace.changes.staged,
          ...appState.workspace.changes.unstaged,
          ...appState.workspace.changes.untracked,
          ...appState.workspace.changes.conflicted
        ].map((file) => file.path)
      )
      if (!paths.has(selectedFile.path)) {
        setSelectedFile(null)
        setDiffResult(null)
      }
    }
  }, [appState, selectedFile])

  const openFolder = async () => {
    if (!window.api) {
      return
    }
    const result = await window.api.selectFolder()
    if (result.ok && result.data) {
      await runCommand({ type: 'open-folder', path: result.data })
    }
  }

  const openWorkspaceByPath = async (path: string) => {
    await runCommand({ type: 'open-folder', path })
    setView('work')
  }

  const pageTitle = useMemo(() => {
    switch (view) {
      case 'terminal':
        return '端末'
      case 'settings':
        return '設定'
      default:
        return '作業'
    }
  }, [view])

  return (
    <div className="app-shell">
      <ActivityBar active={view} onChange={setView} />
      <div className="app-main">
        <header className="app-header">
          <div>
            <h1>Democratization</h1>
            <p>非エンジニア向けの履歴管理ワークスペース</p>
          </div>
          <div className="header-actions">
            <span className="page-title">{pageTitle}</span>
            <button type="button" onClick={refreshState}>
              更新
            </button>
          </div>
        </header>
        {isWebPreview ? (
          <div className="web-banner">Webプレビューでは履歴/端末機能は無効です。</div>
        ) : null}
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <main className="view-area">
          {view === 'work' ? (
            <WorkView
              state={appState}
              diff={diffResult}
              selectedFile={selectedFile}
              isWebPreview={isWebPreview}
              onSelectFolder={openFolder}
              onInitializeProject={() => runCommand({ type: 'initialize-project' })}
              onStartWork={(name) => runCommand({ type: 'start-work', name })}
              onResumeWork={() => runCommand({ type: 'resume-work' })}
              onResetMain={() => runCommand({ type: 'reset-main' })}
              onForceMain={() => runCommand({ type: 'force-main' })}
              onStage={(paths) => runCommand({ type: 'stage', paths })}
              onUnstage={(paths) => runCommand({ type: 'unstage', paths })}
              onDiscard={(paths) => runCommand({ type: 'discard', paths })}
              onDiscardAll={() => runCommand({ type: 'discard-all' })}
              onSaveHistory={(message) => runCommand({ type: 'save-history', message })}
              onCompleteWork={() => runCommand({ type: 'complete-work' })}
              onSelectFile={setSelectedFile}
              onOpenSettings={() => setView('settings')}
            />
          ) : null}
          {view === 'terminal' ? <TerminalPanel isWebPreview={isWebPreview} enabled={!!terminalEnabled} /> : null}
          {view === 'settings' ? (
            <SettingsView
              settings={appState?.settings ?? null}
              isWebPreview={isWebPreview}
              onSave={(settings) => runCommand({ type: 'update-settings', settings })}
              onOpenWorkspace={openWorkspaceByPath}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
