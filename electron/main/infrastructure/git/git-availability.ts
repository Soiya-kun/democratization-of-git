import { spawn } from 'node:child_process'

export const checkGitAvailable = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const child = spawn('git', ['--version'], { stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('exit', (code) => resolve(code === 0))
  })
}
