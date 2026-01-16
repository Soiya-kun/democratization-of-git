import { watch, type FSWatcher } from 'node:fs'

type ChangeListener = () => void

export class WorkspaceWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: NodeJS.Timeout | null = null

  start(path: string, onChange: ChangeListener): void {
    this.stop()
    this.watcher = watch(path, { recursive: true }, () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      this.debounceTimer = setTimeout(() => {
        onChange()
      }, 300)
    })
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
