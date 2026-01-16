import { useMemo, useState, useEffect } from 'react'
import type { AppState, ChangeFile, DiffMode, DiffResult } from '../../shared/ipc'

type SelectedFile = {
  path: string
  mode: DiffMode
}

type WorkViewProps = {
  state: AppState | null
  diff: DiffResult | null
  selectedFile: SelectedFile | null
  isWebPreview: boolean
  onSelectFolder: () => void
  onInitializeProject: () => void
  onStartWork: (name: string) => void
  onResumeWork: () => void
  onResetMain: () => void
  onForceMain: () => void
  onStage: (paths: string[]) => void
  onUnstage: (paths: string[]) => void
  onDiscard: (paths: string[]) => void
  onDiscardAll: () => void
  onSaveHistory: (message?: string) => void
  onCompleteWork: () => void
  onSelectFile: (file: SelectedFile) => void
  onOpenSettings: () => void
}

const useSelection = (files: ChangeFile[]) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const available = new Set(files.map((file) => file.path))
    const next = new Set<string>()
    selected.forEach((path) => {
      if (available.has(path)) {
        next.add(path)
      }
    })
    setSelected(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(files.map((file) => file.path)))
  }

  const clear = () => {
    setSelected(new Set())
  }

  return {
    selected,
    selectedPaths: Array.from(selected),
    toggle,
    selectAll,
    clear
  }
}

const EmptyState = ({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) => {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}

const ChangeSection = ({
  title,
  badge,
  files,
  selectedFile,
  mode,
  disabled,
  onSelectFile,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel
}: {
  title: string
  badge: string
  files: ChangeFile[]
  selectedFile: SelectedFile | null
  mode: DiffMode
  disabled: boolean
  onSelectFile: (file: SelectedFile) => void
  onPrimary?: (paths: string[]) => void
  onSecondary?: (paths: string[]) => void
  primaryLabel?: string
  secondaryLabel?: string
}) => {
  const selection = useSelection(files)
  const hasFiles = files.length > 0
  const hasSelection = selection.selectedPaths.length > 0

  return (
    <div className="changes-section">
      <header>
        <div>
          <h4>{title}</h4>
          <span className="badge subtle">{badge}</span>
        </div>
        <div className="changes-actions">
          {primaryLabel && onPrimary ? (
            <>
              <button type="button" disabled={disabled || !hasSelection} onClick={() => onPrimary(selection.selectedPaths)}>
                選択したものを{primaryLabel}
              </button>
              <button type="button" disabled={disabled || !hasFiles} onClick={() => onPrimary(files.map((file) => file.path))}>
                すべて{primaryLabel}
              </button>
            </>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <>
              <button type="button" disabled={disabled || !hasSelection} onClick={() => onSecondary(selection.selectedPaths)}>
                選択したものを{secondaryLabel}
              </button>
              <button type="button" disabled={disabled || !hasFiles} onClick={() => onSecondary(files.map((file) => file.path))}>
                すべて{secondaryLabel}
              </button>
            </>
          ) : null}
        </div>
      </header>
      {hasFiles ? (
        <ul className="changes-list">
          {files.map((file) => {
            const key = file.path
            const isActive = selectedFile?.path === file.path && selectedFile?.mode === mode
            return (
              <li key={key} className={isActive ? 'active' : ''}>
                <label className="change-row">
                  <input
                    type="checkbox"
                    checked={selection.selected.has(file.path)}
                    onChange={() => selection.toggle(file.path)}
                    disabled={disabled}
                  />
                  <button type="button" onClick={() => onSelectFile({ path: file.path, mode })}>
                    <span className="path">{file.path}</span>
                    {file.renamedFrom ? <span className="rename">← {file.renamedFrom}</span> : null}
                  </button>
                </label>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted">対象の変更はありません。</p>
      )}
    </div>
  )
}

const DiffViewer = ({
  diff,
  selectedFile,
  isWebPreview
}: {
  diff: DiffResult | null
  selectedFile: SelectedFile | null
  isWebPreview: boolean
}) => {
  if (isWebPreview) {
    return <p className="muted">Electron起動時に差分を表示します。</p>
  }

  if (!selectedFile) {
    return <p className="muted">変更ファイルを選択してください。</p>
  }

  if (!diff) {
    return <p className="muted">差分を読み込み中です。</p>
  }

  if (diff.kind === 'binary') {
    return <p className="muted">{diff.message}</p>
  }
  if (diff.kind === 'too-large') {
    return <p className="muted">{diff.message}</p>
  }
  if (diff.kind === 'not-found') {
    return <p className="muted">{diff.message}</p>
  }

  return <pre>{diff.text || '変更はありません。'}</pre>
}

export const WorkView = ({
  state,
  diff,
  selectedFile,
  isWebPreview,
  onSelectFolder,
  onInitializeProject,
  onStartWork,
  onResumeWork,
  onResetMain,
  onForceMain,
  onStage,
  onUnstage,
  onDiscard,
  onDiscardAll,
  onSaveHistory,
  onCompleteWork,
  onSelectFile,
  onOpenSettings
}: WorkViewProps) => {
  const workspace = state?.workspace
  const settings = state?.settings
  const [workNameInput, setWorkNameInput] = useState('')
  const [memo, setMemo] = useState('')

  const settingsMissing = !settings?.userName || !settings?.userEmail
  const canOperate =
    workspace?.kind === 'ready' && workspace.mode === 'work' && !isWebPreview && !settingsMissing

  const workCandidates = useMemo(() => {
    if (workspace?.kind !== 'ready') {
      return []
    }
    return workspace.workCandidates ?? []
  }, [workspace])

  useEffect(() => {
    if (workspace?.kind === 'ready') {
      if (workspace.mode === 'work') {
        setWorkNameInput('')
      } else {
        setMemo('')
      }
    }
  }, [workspace])

  if (isWebPreview) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge">Webプレビュー</span>
        </div>
        <div className="panel-body">
          <p className="muted">Electron起動時に履歴管理機能が有効になります。</p>
        </div>
      </section>
    )
  }

  if (!workspace || workspace.kind === 'empty') {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge">未選択</span>
        </div>
        <div className="panel-body">
          <EmptyState
            title="作業フォルダを開いてください"
            description="管理したいフォルダを選ぶと、履歴管理が開始できます。"
            actionLabel="作業フォルダを開く"
            onAction={onSelectFolder}
          />
        </div>
      </section>
    )
  }

  if (workspace.kind === 'git-missing') {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge warning">Git未導入</span>
        </div>
        <div className="panel-body">
          <p className="muted">
            Gitが見つかりません。Gitをインストールしてから、このアプリを再起動してください。
          </p>
          <button type="button" onClick={onSelectFolder}>
            作業フォルダを開く
          </button>
        </div>
      </section>
    )
  }

  if (workspace.kind === 'needs-init') {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge">準備中</span>
        </div>
        <div className="panel-body">
          <p className="muted">このフォルダはまだ履歴管理が始まっていません。</p>
          <p className="path">{workspace.path}</p>
          <button type="button" onClick={onInitializeProject} disabled={settingsMissing}>
            新たなプロジェクトを開始する
          </button>
          {settingsMissing ? (
            <p className="muted">先に設定から「名前/メール」を入力してください。</p>
          ) : null}
        </div>
      </section>
    )
  }

  if (workspace.kind === 'no-main') {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge warning">非対応</span>
        </div>
        <div className="panel-body">
          <p className="muted">
            このフォルダには閲覧専用の基準がありません。このアプリでは閲覧専用の基準が必要です。
          </p>
          <p className="path">{workspace.path}</p>
        </div>
      </section>
    )
  }

  if (workspace.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>作業</h2>
          <span className="badge warning">要対応</span>
        </div>
        <div className="panel-body">
          <p className="muted">{workspace.message}</p>
          {workspace.action === 'force-main' ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('変更は取り消され、未追跡のファイルも削除されます。よろしいですか？')) {
                  onForceMain()
                }
              }}
            >
              変更を破棄して閲覧専用に戻す
            </button>
          ) : null}
        </div>
      </section>
    )
  }

  const isMain = workspace.mode === 'main'

  return (
    <section className="panel work-panel">
      <div className="panel-header">
        <div>
          <h2>作業</h2>
          <p className="muted">{workspace.path}</p>
        </div>
        <div className="badge-group">
          <span className={`badge ${isMain ? 'muted-badge' : 'active'}`}>{isMain ? '閲覧専用' : '作業中'}</span>
          {workspace.work ? <span className="badge">{workspace.work.name}</span> : null}
        </div>
      </div>
      <div className="panel-body work-body">
        {settingsMissing ? (
          <div className="callout warning">
            <div>
              <strong>初期設定が必要です</strong>
              <p>履歴に記録する「名前」「メールアドレス」を設定してください。</p>
            </div>
            <button type="button" onClick={onOpenSettings}>
              設定へ
            </button>
          </div>
        ) : null}

        {isMain && workCandidates.length > 0 ? (
          <div className="callout">
            <div>
              <strong>作業途中のワークがあります。</strong>
              <p>作業から再開し、それを完了してください。</p>
            </div>
            <button type="button" onClick={onResumeWork}>
              作業を再開する
            </button>
          </div>
        ) : null}

        {isMain && workspace.mainDirty ? (
          <div className="callout warning">
            <div>
              <strong>外部のアプリケーションによって変更が発生しています。</strong>
              <p>続ける前に、作業を開始するか元に戻してください。</p>
            </div>
            <div className="callout-actions">
              {workCandidates.length === 0 ? (
                <button type="button" onClick={() => onStartWork(workNameInput)} disabled={!workNameInput}>
                  新しい作業を開始する
                </button>
              ) : (
                <button type="button" onClick={onResumeWork}>
                  作業を再開する
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      '元に戻すと、変更は取り消され、未追跡のファイルも削除されます。元に戻せません。よろしいですか？'
                    )
                  ) {
                    onResetMain()
                  }
                }}
              >
                元に戻す
              </button>
            </div>
          </div>
        ) : null}

        <div className="work-actions">
          {isMain ? (
            <div className="work-start">
              <label>
                作業名
                <input
                  type="text"
                  value={workNameInput}
                  onChange={(event) => setWorkNameInput(event.target.value)}
                  placeholder="半角英数字とハイフン"
                  disabled={workCandidates.length > 0}
                />
              </label>
              <button
                type="button"
                onClick={() => onStartWork(workNameInput)}
                disabled={workCandidates.length > 0 || !workNameInput}
              >
                作業を開始する
              </button>
              <button type="button" onClick={onResumeWork} disabled={workCandidates.length === 0}>
                作業を再開する
              </button>
            </div>
          ) : (
            <div className="work-start">
              <label>
                メモ
                <input
                  type="text"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="任意"
                />
              </label>
              <button type="button" onClick={() => onSaveHistory(memo)} disabled={!canOperate}>
                この修正の履歴を保存する
              </button>
              <button type="button" onClick={onCompleteWork} disabled={!canOperate}>
                作業を完了する
              </button>
            </div>
          )}
          <div className="work-utility">
            <button type="button" onClick={onSelectFolder}>
              フォルダを開く
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    '元に戻すと、変更は取り消され、未追跡のファイルも削除されます。元に戻せません。よろしいですか？'
                  )
                ) {
                  onDiscardAll()
                }
              }}
              disabled={!canOperate}
            >
              すべて取り消す
            </button>
          </div>
        </div>

        <div className="work-grid">
          <div className="changes-grid">
            <ChangeSection
              title="次の履歴に含める変更"
              badge={`含める ${workspace.changes.staged.length}`}
              files={workspace.changes.staged}
              selectedFile={selectedFile}
              mode="staged"
              disabled={!canOperate}
              onSelectFile={onSelectFile}
              onPrimary={onUnstage}
              onSecondary={(paths) => {
                if (
                  window.confirm(
                    '元に戻すと、変更は取り消され、未追跡のファイルも削除されます。元に戻せません。よろしいですか？'
                  )
                ) {
                  onDiscard(paths)
                }
              }}
              primaryLabel="含めない"
              secondaryLabel="取り消す"
            />
            <ChangeSection
              title="まだ含めない変更"
              badge={`含めない ${workspace.changes.unstaged.length}`}
              files={workspace.changes.unstaged}
              selectedFile={selectedFile}
              mode="unstaged"
              disabled={!canOperate}
              onSelectFile={onSelectFile}
              onPrimary={onStage}
              onSecondary={(paths) => {
                if (
                  window.confirm(
                    '元に戻すと、変更は取り消され、未追跡のファイルも削除されます。元に戻せません。よろしいですか？'
                  )
                ) {
                  onDiscard(paths)
                }
              }}
              primaryLabel="含める"
              secondaryLabel="取り消す"
            />
            <ChangeSection
              title="新しく追加されたファイル"
              badge={`新規 ${workspace.changes.untracked.length}`}
              files={workspace.changes.untracked}
              selectedFile={selectedFile}
              mode="untracked"
              disabled={!canOperate}
              onSelectFile={onSelectFile}
              onPrimary={onStage}
              onSecondary={(paths) => {
                if (
                  window.confirm(
                    '元に戻すと、変更は取り消され、未追跡のファイルも削除されます。元に戻せません。よろしいですか？'
                  )
                ) {
                  onDiscard(paths)
                }
              }}
              primaryLabel="含める"
              secondaryLabel="取り消す"
            />
            <ChangeSection
              title="競合"
              badge={`要対応 ${workspace.changes.conflicted.length}`}
              files={workspace.changes.conflicted}
              selectedFile={selectedFile}
              mode="unstaged"
              disabled
              onSelectFile={onSelectFile}
            />
          </div>
          <div className="diff-panel">
            <h3>変更内容</h3>
            {selectedFile ? <span className="diff-meta">{selectedFile.path}</span> : null}
            <DiffViewer diff={diff} selectedFile={selectedFile} isWebPreview={isWebPreview} />
          </div>
        </div>
      </div>
    </section>
  )
}
