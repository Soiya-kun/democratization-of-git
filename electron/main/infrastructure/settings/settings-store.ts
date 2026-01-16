import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { SettingsState } from '../../../../shared/ipc'

type RawSettings = {
  userName?: string
  userEmail?: string
  recentWorkspaces?: string[]
}

const DEFAULT_SETTINGS: SettingsState = {
  userName: null,
  userEmail: null,
  recentWorkspaces: []
}

export class SettingsStore {
  private cache: SettingsState | null = null

  constructor() {
  }

  async getSettings(): Promise<SettingsState> {
    if (this.cache) {
      return this.cache
    }
    try {
      const raw = await readFile(this.getFilePath(), 'utf8')
      const parsed = JSON.parse(raw) as RawSettings
      const settings: SettingsState = {
        userName: parsed.userName ?? null,
        userEmail: parsed.userEmail ?? null,
        recentWorkspaces: parsed.recentWorkspaces ?? []
      }
      this.cache = settings
      return settings
    } catch {
      this.cache = DEFAULT_SETTINGS
      return DEFAULT_SETTINGS
    }
  }

  async updateSettings(partial: { userName: string; userEmail: string }): Promise<SettingsState> {
    const current = await this.getSettings()
    const next: SettingsState = {
      ...current,
      userName: partial.userName,
      userEmail: partial.userEmail
    }
    await this.write(next)
    return next
  }

  async updateRecentWorkspace(path: string): Promise<SettingsState> {
    const current = await this.getSettings()
    const nextList = [path, ...current.recentWorkspaces.filter((item) => item !== path)].slice(0, 10)
    const next: SettingsState = {
      ...current,
      recentWorkspaces: nextList
    }
    await this.write(next)
    return next
  }

  private async write(settings: SettingsState): Promise<void> {
    this.cache = settings
    const filePath = this.getFilePath()
    const dir = join(filePath, '..')
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8')
  }

  private getFilePath(): string {
    const baseDir = app.getPath('userData')
    return join(baseDir, 'settings.json')
  }
}
