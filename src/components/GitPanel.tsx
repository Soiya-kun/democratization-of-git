type GitFile = {
  path: string
  working_dir: string
  index: string
}

type GitPanelProps = {
  branch: string
  files: GitFile[]
  selectedFile: string | null
  diff: string
  onSelectFile: (file: string | null) => void
  isWebPreview: boolean
}

const statusLabel = (file: GitFile) => {
  const markers = [file.index, file.working_dir].filter((value) => value && value !== ' ')
  return markers.join('') || ' '
}

export const GitPanel = ({ branch, files, selectedFile, diff, onSelectFile, isWebPreview }: GitPanelProps) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Source Control</h2>
        <span className="badge">{branch}</span>
      </div>
      <div className="panel-body">
        <div className="panel-split">
          <div className="file-list">
            <h3>Changes</h3>
            {files.length === 0 ? (
              <p className="empty">変更はありません</p>
            ) : (
              <ul>
                {files.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      className={selectedFile === file.path ? 'active' : ''}
                      onClick={() => onSelectFile(file.path)}
                    >
                      <span className="status">{statusLabel(file)}</span>
                      <span className="path">{file.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="diff-view">
            <h3>Diff</h3>
            <pre>{isWebPreview ? 'Electron起動時にGit diffを表示します。' : diff || 'ファイルを選択してください'}</pre>
          </div>
        </div>
      </div>
    </section>
  )
}
