import type { SettingsState } from '../../shared/ipc'

type SettingsViewProps = {
  settings: SettingsState | null
  isWebPreview: boolean
  onSave: (payload: { userName: string; userEmail: string }) => void
  onOpenWorkspace: (path: string) => void
}

export const SettingsView = ({ settings, isWebPreview, onSave, onOpenWorkspace }: SettingsViewProps) => {
  const userName = settings?.userName ?? ''
  const userEmail = settings?.userEmail ?? ''

  if (isWebPreview) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>設定</h2>
        </div>
        <div className="panel-body">
          <p className="muted">Webプレビューでは設定を保存できません。</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>設定</h2>
        <span className="badge">基本</span>
      </div>
      <div className="panel-body settings-body">
        <div className="settings-section">
          <h3>履歴に記録する情報</h3>
          <p className="muted">このアプリで管理するプロジェクトにのみ適用されます。</p>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              const data = new FormData(form)
              const nextName = String(data.get('userName') || '').trim()
              const nextEmail = String(data.get('userEmail') || '').trim()
              if (!nextName || !nextEmail) {
                return
              }
              onSave({ userName: nextName, userEmail: nextEmail })
            }}
          >
            <label>
              <span>名前</span>
              <input type="text" name="userName" defaultValue={userName} placeholder="例: 山田 太郎" required />
            </label>
            <label>
              <span>メールアドレス</span>
              <input type="email" name="userEmail" defaultValue={userEmail} placeholder="example@example.com" required />
            </label>
            <button type="submit">保存する</button>
          </form>
        </div>
        <div className="settings-section">
          <h3>最近開いたフォルダ</h3>
          {settings?.recentWorkspaces?.length ? (
            <ul className="recent-list">
              {settings.recentWorkspaces.map((path) => (
                <li key={path}>
                  <button type="button" onClick={() => onOpenWorkspace(path)}>
                    {path}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">まだ履歴がありません。</p>
          )}
        </div>
      </div>
    </section>
  )
}
