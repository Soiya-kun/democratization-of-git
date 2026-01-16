import { useEffect, useMemo, useState } from 'react'
import { GitPanel } from './GitPanel'
import { TerminalPanel } from './TerminalPanel'

const fallbackStatus = {
  current: 'web-preview',
  files: [] as Array<{ path: string; working_dir: string; index: string }>
}

export const App = () => {
  const [status, setStatus] = useState<{
    current: string | null
    files: Array<{ path: string; working_dir: string; index: string }>
  } | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const isWebPreview = !window.api

  const fileList = useMemo(() => status?.files ?? [], [status])

  const refreshStatus = async () => {
    if (!window.api) {
      setStatus(fallbackStatus)
      setSelectedFile(null)
      setDiff('WebプレビューではGit情報は取得できません。')
      return
    }

    const nextStatus = await window.api.gitStatus()
    setStatus(nextStatus)
    if (nextStatus.files.length === 0) {
      setSelectedFile(null)
      setDiff('')
    }
  }

  useEffect(() => {
    void refreshStatus()
  }, [])

  useEffect(() => {
    if (!selectedFile || !window.api) {
      return
    }

    const fetchDiff = async () => {
      const diffText = await window.api.gitDiff(selectedFile)
      setDiff(diffText)
    }

    void fetchDiff()
  }, [selectedFile])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Git Workspace</h1>
          <p>Visual Studio Codeの操作感を意識したGitとShellの統合ワークスペース</p>
        </div>
        <button type="button" onClick={refreshStatus}>
          Refresh
        </button>
      </header>
      {isWebPreview ? (
        <div className="web-banner">WebプレビューではGit/Shell機能は無効です。</div>
      ) : null}
      <main className="app-main">
        <GitPanel
          branch={status?.current ?? 'main'}
          files={fileList}
          selectedFile={selectedFile}
          diff={diff}
          onSelectFile={setSelectedFile}
          isWebPreview={isWebPreview}
        />
        <TerminalPanel isWebPreview={isWebPreview} />
      </main>
    </div>
  )
}
