import { useEffect, useId, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

type TerminalPanelProps = {
  isWebPreview: boolean
}

export const TerminalPanel = ({ isWebPreview }: TerminalPanelProps) => {
  const terminalId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (isWebPreview || !window.api) {
      return
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      theme: {
        background: '#0f1116'
      }
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    if (containerRef.current) {
      terminal.open(containerRef.current)
      fitAddon.fit()
    }

    void window.api.createShell(terminalId)

    terminal.onData((data) => {
      void window.api.sendShellInput({ id: terminalId, data })
    })

    window.api.onShellData(({ id, data }) => {
      if (id === terminalId) {
        terminal.write(data)
      }
    })

    const handleResize = () => {
      fitAddon.fit()
      void window.api.resizeShell({
        id: terminalId,
        cols: terminal.cols,
        rows: terminal.rows
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      void window.api.closeShell(terminalId)
      terminal.dispose()
    }
  }, [terminalId, isWebPreview])

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Terminal</h2>
        <span className="badge">Shell</span>
      </div>
      <div className="panel-body terminal-body">
        {isWebPreview ? (
          <div className="terminal-placeholder">Electron起動時にShellがここへ表示されます。</div>
        ) : (
          <div ref={containerRef} className="terminal-container" />
        )}
      </div>
    </section>
  )
}
