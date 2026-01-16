type ActivityBarProps = {
  active: 'work' | 'terminal' | 'settings'
  onChange: (view: 'work' | 'terminal' | 'settings') => void
}

const items: Array<{ id: ActivityBarProps['active']; label: string; caption: string }> = [
  { id: 'work', label: '作業', caption: '履歴' },
  { id: 'terminal', label: '端末', caption: 'コマンド' },
  { id: 'settings', label: '設定', caption: '基本' }
]

export const ActivityBar = ({ active, onChange }: ActivityBarProps) => {
  return (
    <nav className="activity-bar">
      <div className="activity-brand">D</div>
      <div className="activity-items">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? 'active' : ''}
            onClick={() => onChange(item.id)}
          >
            <span>{item.label}</span>
            <small>{item.caption}</small>
          </button>
        ))}
      </div>
    </nav>
  )
}
