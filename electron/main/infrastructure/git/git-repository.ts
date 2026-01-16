import { readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { simpleGit, type SimpleGit } from 'simple-git'
import { ApplicationError } from '../../domain/errors'
import type { ChangeFile } from '../../../../shared/ipc'

const MAX_DIFF_CHARS = 1_000_000

const ensureInsideRoot = (root: string, targetPath: string) => {
  const resolved = resolve(root, targetPath)
  const rel = relative(root, resolved)
  if (!rel || rel.startsWith('..') || rel.includes('..\\') || rel.includes('../')) {
    throw new ApplicationError('invalid-path', '不正なファイルパスです。')
  }
  return resolved
}

export class GitRepository {
  private readonly git: SimpleGit
  private readonly root: string

  constructor(root: string) {
    this.root = root
    this.git = simpleGit({ baseDir: root })
  }

  getRoot(): string {
    return this.root
  }

  async checkIsRepo(): Promise<boolean> {
    return this.git.checkIsRepo()
  }

  async getTopLevel(): Promise<string> {
    const result = await this.git.revparse(['--show-toplevel'])
    return result.trim()
  }

  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.branchLocal()
    return branch.current
  }

  async listBranches(): Promise<string[]> {
    const branch = await this.git.branchLocal()
    return branch.all
  }

  async raw(args: string[]): Promise<string> {
    return this.git.raw(args)
  }

  async getStatusFiles(): Promise<ChangeFile[]> {
    const status = await this.git.status()
    return status.files.map((file) => {
      const conflicted = file.index === 'U' || file.working_dir === 'U'
      const staged = file.index !== ' ' && file.index !== '?' && !conflicted
      const unstaged = file.working_dir !== ' ' && file.working_dir !== '?' && !conflicted
      const untracked = file.working_dir === '?' || file.index === '?'
      return {
        path: file.path,
        staged,
        unstaged,
        untracked,
        conflicted,
        renamedFrom: file.from
      }
    })
  }

  async hasChanges(): Promise<boolean> {
    const status = await this.git.status()
    return status.files.length > 0
  }

  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch)
  }

  async checkoutNew(branch: string): Promise<void> {
    await this.git.checkoutLocalBranch(branch)
  }

  async add(paths: string[]): Promise<void> {
    await this.git.add(paths)
  }

  async reset(paths: string[]): Promise<void> {
    await this.git.raw(['reset', 'HEAD', '--', ...paths])
  }

  async discardPaths(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return
    }
    const status = await this.git.status()
    const untrackedSet = new Set(
      status.files.filter((file) => file.working_dir === '?' || file.index === '?').map((file) => file.path)
    )
    const tracked = paths.filter((path) => !untrackedSet.has(path))
    const untracked = paths.filter((path) => untrackedSet.has(path))
    if (tracked.length > 0) {
      await this.git.checkout(['--', ...tracked])
    }
    if (untracked.length > 0) {
      await this.git.raw(['clean', '-f', '--', ...untracked])
    }
  }

  async resetHard(): Promise<void> {
    await this.git.reset(['--hard'])
  }

  async cleanAll(): Promise<void> {
    await this.git.raw(['clean', '-fd'])
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message)
  }

  async mergeFastForward(branch: string): Promise<void> {
    await this.git.merge(['--ff-only', branch])
  }

  async deleteBranch(branch: string): Promise<void> {
    await this.git.deleteLocalBranch(branch, true)
  }

  async initMain(): Promise<void> {
    await this.git.raw(['init', '-b', 'main'])
  }

  async addAll(): Promise<void> {
    await this.git.add(['-A'])
  }

  async getConfig(key: string): Promise<string | null> {
    try {
      const result = await this.git.getConfig(key)
      return result.value ?? null
    } catch {
      return null
    }
  }

  async setConfig(key: string, value: string): Promise<void> {
    await this.git.addConfig(key, value, false, 'local')
  }

  async diff(path: string, mode: 'staged' | 'unstaged'): Promise<string> {
    if (mode === 'staged') {
      return this.git.raw(['diff', '--cached', '--', path])
    }
    return this.git.raw(['diff', '--', path])
  }

  async diffNumstat(path: string, mode: 'staged' | 'unstaged'): Promise<string> {
    if (mode === 'staged') {
      return this.git.raw(['diff', '--cached', '--numstat', '--', path])
    }
    return this.git.raw(['diff', '--numstat', '--', path])
  }

  async readFileText(path: string): Promise<string> {
    const resolved = ensureInsideRoot(this.root, path)
    return readFile(resolved, 'utf8')
  }

  async isBinary(path: string): Promise<boolean> {
    const resolved = ensureInsideRoot(this.root, path)
    const buffer = await readFile(resolved)
    return buffer.includes(0)
  }

  async isBinaryDiff(path: string, mode: 'staged' | 'unstaged'): Promise<boolean> {
    const output = await this.diffNumstat(path, mode)
    return output.split('\n').some((line) => line.startsWith('-\t-\t'))
  }

  formatDiffText(text: string): string {
    if (text.length > MAX_DIFF_CHARS) {
      throw new ApplicationError('diff-too-large', '変更箇所が多すぎるため表示できません。')
    }
    return text
  }
}
