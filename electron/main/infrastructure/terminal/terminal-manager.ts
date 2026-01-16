import { platform } from 'node:process'
import { spawn, type IPty } from 'node-pty'

type TerminalListener = (payload: { id: string; data: string }) => void

export class TerminalManager {
  private readonly terminals = new Map<string, IPty>()
  private readonly listeners = new Set<TerminalListener>()

  createTerminal(id: string, cwd: string): void {
    const shell = platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
    const terminal = spawn(shell, [], {
      cols: 80,
      rows: 24,
      cwd,
      env: process.env
    })

    this.terminals.set(id, terminal)

    terminal.onData((data) => {
      this.listeners.forEach((listener) => listener({ id, data }))
    })

    terminal.onExit(() => {
      this.terminals.delete(id)
    })
  }

  onData(listener: TerminalListener): void {
    this.listeners.add(listener)
  }

  write({ id, data }: { id: string; data: string }): void {
    const terminal = this.terminals.get(id)
    terminal?.write(data)
  }

  resize({ id, cols, rows }: { id: string; cols: number; rows: number }): void {
    const terminal = this.terminals.get(id)
    terminal?.resize(cols, rows)
  }

  close(id: string): void {
    const terminal = this.terminals.get(id)
    terminal?.kill()
    this.terminals.delete(id)
  }
}
