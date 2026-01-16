import { DomainError } from './errors'

const WORK_NAME_PATTERN = /^[A-Za-z0-9-]+$/
const WORK_BRANCH_PREFIX = 'work-'
const RESERVED_NAMES = new Set(['main', 'master', 'work'])

export class WorkName {
  readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static parse(raw: string): WorkName {
    const trimmed = raw.trim()
    if (!trimmed) {
      throw new DomainError('work-name-empty', '作業名を入力してください。')
    }
    if (!WORK_NAME_PATTERN.test(trimmed)) {
      throw new DomainError('work-name-invalid', '作業名は半角英数字とハイフンのみ利用できます。')
    }
    if (RESERVED_NAMES.has(trimmed)) {
      throw new DomainError('work-name-reserved', 'この作業名は利用できません。')
    }
    return new WorkName(trimmed)
  }
}

export const toWorkBranch = (name: WorkName): string => `${WORK_BRANCH_PREFIX}${name.value}`

export const isWorkBranch = (branch: string): boolean => branch.startsWith(WORK_BRANCH_PREFIX)

export const workNameFromBranch = (branch: string): WorkName | null => {
  if (!isWorkBranch(branch)) {
    return null
  }
  const raw = branch.slice(WORK_BRANCH_PREFIX.length)
  if (!raw || !WORK_NAME_PATTERN.test(raw) || RESERVED_NAMES.has(raw)) {
    return null
  }
  return new WorkName(raw)
}
