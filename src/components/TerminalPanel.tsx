import { useEffect, useId, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

type TerminalPanelProps = {
  isWebPreview: boolean
  enabled: boolean
}

export const TerminalPanel = ({ isWebPreview, enabled }: TerminalPanelProps) => {
  const terminalId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (isWebPreview || !window.api || !enabled) {
      return
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      theme: {
        background: '#111816',
        foreground: '#dce7e1'
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

    void window.api.createTerminal(terminalId)

    terminal.onData((data) => {
      void window.api.sendTerminalInput({ id: terminalId, data })
    })

    const unsubscribe = window.api.onTerminalData(({ id, data }) => {
      if (id === terminalId) {
        terminal.write(data)
      }
    })

    const handleResize = () => {
      fitAddon.fit()
      void window.api.resizeTerminal({
        id: terminalId,
        cols: terminal.cols,
        rows: terminal.rows
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      void window.api.closeTerminal(terminalId)
      terminal.dispose()
      unsubscribe()
    }
  }, [terminalId, isWebPreview, enabled])

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>端末</h2>
        <span className="badge">コマンド</span>
      </div>
      <div className="panel-body terminal-body">
        {isWebPreview || !enabled ? (
          <div className="terminal-placeholder">
            {isWebPreview ? 'Electron起動時に端末がここへ表示されます。' : '作業フォルダを開くと端末が使えます。'}
          </div>
        ) : (
          <div ref={containerRef} className="terminal-container" />
        )}
      </div>
    </section>
  )
}
