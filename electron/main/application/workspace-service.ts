import { EventEmitter } from 'node:events'
import { stat, writeFile } from 'node:fs/promises'
import { join, isAbsolute, normalize } from 'node:path'
import type { AppState, AppCommand, WorkspaceState, ChangeSummary, DiffRequest, DiffResult, SettingsState, WorkInfo } from '../../../shared/ipc'
import { ApplicationError } from '../domain/errors'
import { WorkName, isWorkBranch, toWorkBranch, workNameFromBranch } from '../domain/work'
import { GitRepository } from '../infrastructure/git/git-repository'
import { checkGitAvailable } from '../infrastructure/git/git-availability'
import { SettingsStore } from '../infrastructure/settings/settings-store'
import { WorkspaceWatcher } from '../infrastructure/workspace/workspace-watcher'

type RepoContext = {
  root: string
  git: GitRepository
}

export class WorkspaceService extends EventEmitter {
  private readonly settingsStore: SettingsStore
  private readonly watcher = new WorkspaceWatcher()
  private selectedPath: string | null = null
  private repoContext: RepoContext | null = null
  private gitAvailable: boolean | null = null

  constructor(settingsStore: SettingsStore) {
    super()
    this.settingsStore = settingsStore
  }

  async getAppState(): Promise<AppState> {
    const settings = await this.settingsStore.getSettings()
    const workspace = await this.getWorkspaceState(settings)
    const refreshedSettings = await this.settingsStore.getSettings()
    return { settings: refreshedSettings, workspace }
  }

  async runCommand(command: AppCommand): Promise<AppState> {
    switch (command.type) {
      case 'open-folder':
        this.selectedPath = command.path
        this.repoContext = null
        await this.settingsStore.updateRecentWorkspace(command.path)
        break
      case 'initialize-project':
        await this.initializeProject()
        break
      case 'start-work':
        await this.startWork(command.name)
        break
      case 'resume-work':
        await this.resumeWork()
        break
      case 'reset-main':
        await this.resetMain()
        break
      case 'force-main':
        await this.forceCheckoutMain()
        break
      case 'stage':
        await this.stagePaths(command.paths)
        break
      case 'unstage':
        await this.unstagePaths(command.paths)
        break
      case 'discard':
        await this.discardPaths(command.paths)
        break
      case 'discard-all':
        await this.discardAll()
        break
      case 'save-history':
        await this.saveHistory(command.message)
        break
      case 'complete-work':
        await this.completeWork()
        break
      case 'update-settings':
        await this.settingsStore.updateSettings(command.settings)
        break
      case 'refresh':
        break
      default:
        break
    }
    const state = await this.getAppState()
    this.emit('changed')
    return state
  }

  async getDiff(request: DiffRequest): Promise<DiffResult> {
    const repo = this.requireRepo()
    const safePath = this.ensureSafePath(request.path)
    if (request.mode === 'untracked') {
      try {
        const isBinary = await repo.isBinary(safePath)
        if (isBinary) {
          return { kind: 'binary', message: 'バイナリファイルのため表示できません。' }
        }
        const text = await repo.readFileText(safePath)
        if (text.length > 1_000_000) {
          return { kind: 'too-large', message: '変更箇所が多すぎるため表示できません。' }
        }
        return { kind: 'text', text }
      } catch {
        return { kind: 'not-found', message: 'ファイルが見つかりません。' }
      }
    }

    const isBinaryDiff = await repo.isBinaryDiff(safePath, request.mode)
    if (isBinaryDiff) {
      return { kind: 'binary', message: 'バイナリファイルのため表示できません。' }
    }

    const diffText = await repo.diff(safePath, request.mode)
    try {
      const formatted = repo.formatDiffText(diffText)
      return { kind: 'text', text: formatted || '変更はありません。' }
    } catch (error) {
      if (error instanceof ApplicationError && error.code === 'diff-too-large') {
        return { kind: 'too-large', message: error.message }
      }
      return { kind: 'not-found', message: '差分を取得できませんでした。' }
    }
  }

  private async getWorkspaceState(settings: SettingsState): Promise<WorkspaceState> {
    if (!this.selectedPath) {
      const recent = settings.recentWorkspaces[0]
      if (recent) {
        this.selectedPath = recent
      } else {
        return { kind: 'empty' }
      }
    }

    try {
      await stat(this.selectedPath)
    } catch {
      this.selectedPath = null
      this.repoContext = null
      return { kind: 'empty' }
    }

    const gitAvailable = await this.ensureGitAvailable()
    if (!gitAvailable) {
      return { kind: 'git-missing' }
    }

    const repoCandidate = new GitRepository(this.selectedPath)
    const isRepo = await repoCandidate.checkIsRepo()
    if (!isRepo) {
      this.repoContext = null
      this.watcher.stop()
      return { kind: 'needs-init', path: this.selectedPath }
    }

    const root = await repoCandidate.getTopLevel()
    this.selectedPath = root
    this.repoContext = {
      root,
      git: new GitRepository(root)
    }
    if (settings.recentWorkspaces[0] !== root) {
      await this.settingsStore.updateRecentWorkspace(root)
    }

    const branches = await this.repoContext.git.listBranches()
    if (!branches.includes('main')) {
      this.watcher.stop()
      return { kind: 'no-main', path: root }
    }

    await this.ensureManagedMark(this.repoContext.git)
    await this.ensureUserConfig(this.repoContext.git, settings)

    const branchState = await this.ensureSupportedBranch(this.repoContext.git)
    if (branchState.kind === 'error') {
      this.watcher.stop()
      return branchState
    }

    const currentBranch = branchState.branch
    const mode: 'main' | 'work' = isWorkBranch(currentBranch) ? 'work' : 'main'
    const workCandidates = await this.getWorkBranches(this.repoContext.git)
    const work =
      mode === 'work'
        ? workCandidates.find((item) => item.branch === currentBranch) ??
          (workNameFromBranch(currentBranch)
            ? { branch: currentBranch, name: workNameFromBranch(currentBranch)!.value }
            : null)
        : null
    const files = await this.repoContext.git.getStatusFiles()
    const changes = this.toChangeSummary(files)
    const mainDirty = mode === 'main' && files.length > 0

    this.watcher.start(root, () => {
      this.emit('changed')
    })

    return {
      kind: 'ready',
      path: root,
      mode,
      isManaged: (await this.repoContext.git.getConfig('democratization-of-git.managed')) === 'true',
      work,
      workCandidates,
      changes,
      mainDirty
    }
  }

  private async ensureGitAvailable(): Promise<boolean> {
    if (this.gitAvailable !== null) {
      return this.gitAvailable
    }
    this.gitAvailable = await checkGitAvailable()
    return this.gitAvailable
  }

  private requireRepo(): GitRepository {
    if (!this.repoContext) {
      throw new ApplicationError('workspace-not-ready', '作業フォルダを開いてください。')
    }
    return this.repoContext.git
  }

  private ensureSafePath(path: string): string {
    if (!path) {
      throw new ApplicationError('invalid-path', '不正なファイルパスです。')
    }
    const normalized = normalize(path)
    if (isAbsolute(normalized) || normalized.startsWith('..')) {
      throw new ApplicationError('invalid-path', '不正なファイルパスです。')
    }
    return normalized
  }

  private async ensureManagedMark(repo: GitRepository): Promise<void> {
    const managed = await repo.getConfig('democratization-of-git.managed')
    if (managed !== 'true') {
      await repo.setConfig('democratization-of-git.managed', 'true')
    }
    const version = await repo.getConfig('democratization-of-git.version')
    if (version !== '1') {
      await repo.setConfig('democratization-of-git.version', '1')
    }
  }

  private async ensureUserConfig(repo: GitRepository, settings: SettingsState): Promise<void> {
    const existingName = await repo.getConfig('user.name')
    const existingEmail = await repo.getConfig('user.email')
    if (!existingName || !existingEmail) {
      if (settings.userName && settings.userEmail) {
        if (!existingName) {
          await repo.setConfig('user.name', settings.userName)
        }
        if (!existingEmail) {
          await repo.setConfig('user.email', settings.userEmail)
        }
      }
    }
  }

  private async ensureSupportedBranch(repo: GitRepository): Promise<{ kind: 'ok'; branch: string } | WorkspaceState> {
    const currentBranch = await repo.getCurrentBranch()
    if (currentBranch === 'main' || isWorkBranch(currentBranch)) {
      return { kind: 'ok', branch: currentBranch }
    }
    try {
      await repo.checkout('main')
      return { kind: 'ok', branch: 'main' }
    } catch {
      return {
        kind: 'error',
        path: repo.getRoot(),
        message: '閲覧専用の状態へ切り替えできません。変更を破棄してやり直してください。',
        action: 'force-main'
      }
    }
  }

  private async initializeProject(): Promise<void> {
    if (!this.selectedPath) {
      throw new ApplicationError('workspace-not-ready', '作業フォルダを開いてください。')
    }
    const settings = await this.settingsStore.getSettings()
    if (!settings.userName || !settings.userEmail) {
      throw new ApplicationError('settings-required', '履歴に記録する名前とメールを設定してください。')
    }
    const repo = new GitRepository(this.selectedPath)
    await repo.initMain()
    await repo.setConfig('democratization-of-git.managed', 'true')
    await repo.setConfig('democratization-of-git.version', '1')
    await repo.setConfig('user.name', settings.userName)
    await repo.setConfig('user.email', settings.userEmail)
    await this.ensureTemplateFiles(this.selectedPath)
    await repo.addAll()
    await repo.commit('プロジェクト開始')
  }

  private async ensureTemplateFiles(basePath: string): Promise<void> {
    const gitignorePath = join(basePath, '.gitignore')
    const agentsPath = join(basePath, 'AGENTS.md')
    await this.ensureFileIfMissing(gitignorePath, '# このアプリで管理するフォルダ向けの設定です。\n')
    await this.ensureFileIfMissing(
      agentsPath,
      'このフォルダの履歴はこのアプリで管理します。\n作業を始めるときはアプリで「作業を開始する」を選んでください。\n'
    )
  }

  private async ensureFileIfMissing(path: string, content: string): Promise<void> {
    try {
      await stat(path)
    } catch {
      await writeFile(path, content, 'utf8')
    }
  }

  private async getWorkBranches(repo: GitRepository): Promise<WorkInfo[]> {
    const output = await repo.raw([
      'for-each-ref',
      '--sort=-committerdate',
      '--format=%(refname:short)\t%(committerdate:iso8601)',
      'refs/heads/work-*'
    ])
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [branch, date] = line.split('\t')
        const workName = workNameFromBranch(branch)
        if (!workName) {
          return null
        }
        return {
          branch,
          name: workName.value,
          updatedAt: date
        }
      })
      .filter((item): item is WorkInfo => item !== null)
  }

  private toChangeSummary(files: ChangeSummary['staged']): ChangeSummary {
    const staged: ChangeSummary['staged'] = []
    const unstaged: ChangeSummary['unstaged'] = []
    const untracked: ChangeSummary['untracked'] = []
    const conflicted: ChangeSummary['conflicted'] = []
    files.forEach((file) => {
      if (file.conflicted) {
        conflicted.push(file)
        return
      }
      if (file.untracked) {
        untracked.push(file)
        return
      }
      if (file.staged) {
        staged.push(file)
      }
      if (file.unstaged) {
        unstaged.push(file)
      }
    })
    return { staged, unstaged, untracked, conflicted }
  }

  private async startWork(name: string): Promise<void> {
    const repo = this.requireRepo()
    const workName = WorkName.parse(name)
    const workBranches = await this.getWorkBranches(repo)
    if (workBranches.length > 0) {
      throw new ApplicationError('work-exists', '作業途中のワークがあります。作業を再開してください。')
    }
    const currentBranch = await repo.getCurrentBranch()
    if (currentBranch !== 'main') {
      throw new ApplicationError('not-on-main', '閲覧専用の状態から作業を開始してください。')
    }
    await repo.checkoutNew(toWorkBranch(workName))
  }

  private async resumeWork(): Promise<void> {
    const repo = this.requireRepo()
    const workBranches = await this.getWorkBranches(repo)
    if (workBranches.length === 0) {
      throw new ApplicationError('work-missing', '作業途中のワークが見つかりません。')
    }
    const latest = workBranches[0]
    const currentBranch = await repo.getCurrentBranch()
    if (currentBranch === 'main') {
      const hasChanges = await repo.hasChanges()
      if (hasChanges) {
        await repo.resetHard()
        await repo.cleanAll()
      }
    }
    await repo.checkout(latest.branch)
  }

  private async resetMain(): Promise<void> {
    const repo = this.requireRepo()
    const currentBranch = await repo.getCurrentBranch()
    if (currentBranch !== 'main') {
      throw new ApplicationError('not-on-main', '閲覧専用の状態で実行してください。')
    }
    await repo.resetHard()
    await repo.cleanAll()
  }

  private async forceCheckoutMain(): Promise<void> {
    const repo = this.requireRepo()
    await repo.resetHard()
    await repo.cleanAll()
    await repo.checkout('main')
  }

  private async stagePaths(paths: string[]): Promise<void> {
    const repo = this.requireRepo()
    await this.ensureOnWork(repo)
    const safePaths = paths.map((path) => this.ensureSafePath(path))
    await repo.add(safePaths)
  }

  private async unstagePaths(paths: string[]): Promise<void> {
    const repo = this.requireRepo()
    await this.ensureOnWork(repo)
    const safePaths = paths.map((path) => this.ensureSafePath(path))
    await repo.reset(safePaths)
  }

  private async discardPaths(paths: string[]): Promise<void> {
    const repo = this.requireRepo()
    await this.ensureOnWork(repo)
    const safePaths = paths.map((path) => this.ensureSafePath(path))
    await repo.discardPaths(safePaths)
  }

  private async discardAll(): Promise<void> {
    const repo = this.requireRepo()
    await this.ensureOnWork(repo)
    await repo.resetHard()
    await repo.cleanAll()
  }

  private async saveHistory(message?: string): Promise<void> {
    const repo = this.requireRepo()
    await this.ensureOnWork(repo)
    const settings = await this.settingsStore.getSettings()
    if (!settings.userName || !settings.userEmail) {
      throw new ApplicationError('settings-required', '履歴に記録する名前とメールを設定してください。')
    }
    const statusFiles = await repo.getStatusFiles()
    const hasStaged = statusFiles.some((file) => file.staged)
    if (!hasStaged) {
      throw new ApplicationError('nothing-to-save', '含める変更がありません。')
    }
    const commitMessage = message?.trim() || this.buildTimestampMessage()
    await repo.commit(commitMessage)
  }

  private async completeWork(): Promise<void> {
    const repo = this.requireRepo()
    const currentBranch = await this.ensureOnWork(repo)
    const settings = await this.settingsStore.getSettings()
    if (!settings.userName || !settings.userEmail) {
      throw new ApplicationError('settings-required', '履歴に記録する名前とメールを設定してください。')
    }
    const hasChanges = await repo.hasChanges()
    if (hasChanges) {
      await repo.addAll()
      await repo.commit('自動保存(完了前)')
    }
    await repo.checkout('main')
    await repo.mergeFastForward(currentBranch)
    await repo.deleteBranch(currentBranch)
  }

  private async ensureOnWork(repo: GitRepository): Promise<string> {
    const currentBranch = await repo.getCurrentBranch()
    if (!isWorkBranch(currentBranch)) {
      throw new ApplicationError('not-on-work', '作業中のみ実行できます。')
    }
    return currentBranch
  }

  private buildTimestampMessage(): string {
    const now = new Date()
    const date = now.toLocaleDateString('ja-JP')
    const time = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    return `${date} ${time}`
  }
}
