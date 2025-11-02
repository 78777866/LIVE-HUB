'use client'

import { useEffect, useRef } from 'react'
import { PanelShell } from '@/components/panels/PanelShell'
import { useAppStore } from '@/state/app-store'
import { cn } from '@/lib/utils'

export function ConsolePanel() {
  const consoleLines = useAppStore((state) => state.consoleLines)
  const resetConsole = useAppStore((state) => state.resetConsole)
  const webContainerStatus = useAppStore((state) => state.webContainer.status)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }

    node.scrollTop = node.scrollHeight
  }, [consoleLines])

  const panelStatus =
    webContainerStatus === 'ready'
      ? 'ready'
      : webContainerStatus === 'error'
        ? 'error'
        : webContainerStatus === 'idle'
          ? 'idle'
          : 'loading'


  return (
    <PanelShell
      title="Console"
      status={panelStatus}
      className="xl:min-h-[280px]"
      autoExpand={true}
      toolbar={
        <div className="flex items-center gap-1 text-[9px]">
          <span className="rounded-full border border-slate-700 px-1.5 py-0.5 uppercase tracking-[0.15em] text-slate-400">
            {consoleLines.length} logs
          </span>
          <button
            type="button"
            onClick={resetConsole}
            disabled={consoleLines.length === 0}
            className={cn(
              'rounded-full border px-1.5 py-0.5 uppercase tracking-[0.15em] transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default',
              'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white',
              consoleLines.length === 0 &&
                'cursor-not-allowed border-slate-800 text-slate-600 hover:border-slate-800 hover:text-slate-600',
            )}
          >
            Clear
          </button>
        </div>
      }
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-2 font-mono text-[9px] leading-relaxed text-slate-300"
        >
          {consoleLines.length === 0 ? (
            <p className="text-slate-500 text-[10px]">Console output will appear here.</p>
          ) : (
            <ul className="space-y-1">
              {consoleLines.map((line) => (
                <li
                  key={line.id}
                  className={cn(
                    'flex items-start gap-1.5 rounded border border-transparent px-1.5 py-1',
                    line.level === 'error'
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-100'
                      : line.level === 'warn'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                        : 'bg-transparent text-slate-300',
                  )}
                >
                  <span className="mt-0.5 text-[8px] uppercase tracking-[0.15em] text-slate-500">
                    {new Date(line.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="flex-1">{line.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PanelShell>
  )
}