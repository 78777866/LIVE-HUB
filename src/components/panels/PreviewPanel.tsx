'use client'

import { useMemo } from 'react'
import { PanelShell } from '@/components/panels/PanelShell'
import { useAppStore } from '@/state/app-store'

const PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LiveHub Preview</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      body {
        margin: 0;
        display: grid;
        min-height: 100vh;
        place-items: center;
      }
      .surface {
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        background: rgba(15, 23, 42, 0.6);
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.4);
      }
      h1 {
        font-size: 16px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      p {
        font-size: 11px;
        line-height: 1.5;
        color: rgba(226, 232, 240, 0.74);
      }
    </style>
  </head>
  <body>
    <div class="surface">
      <h1>Preview</h1>
      <p>This iframe will render the active WebContainer application once wired in.</p>
      <p>For now, it provides a safe space to validate layout behavior.</p>
    </div>
  </body>
</html>`

export function PreviewPanel() {
  const webContainerStatus = useAppStore((state) => state.webContainer.status)
  const previewUrl = useAppStore((state) => state.webContainer.previewUrl)
  const previewPort = useAppStore((state) => state.webContainer.previewPort)
  const devCommandLabel = useAppStore((state) => state.webContainer.devCommandLabel)
  const lastMessage = useAppStore((state) => state.webContainer.lastMessage)
  const errorMessage = useAppStore((state) => state.webContainer.error)

  const status = useMemo(() => {
    if (webContainerStatus === 'ready') return 'ready' as const
    if (webContainerStatus === 'error') return 'error' as const
    if (webContainerStatus === 'idle') return 'idle' as const
    return 'loading' as const
  }, [webContainerStatus])

  const hasPreview = status === 'ready' && Boolean(previewUrl)
  const portLabel = previewPort ? `Port ${previewPort}` : 'Awaiting port'
  const commandLabel = devCommandLabel ?? 'Dev server pending'

  return (
    <PanelShell
      title="Preview"
      status={status}
      className="flex h-full flex-col"
      autoExpand={true}
      toolbar={
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
          <span className="rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-[0.25em]">
            {portLabel}
          </span>
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] tracking-[0.15em] text-slate-300">
            {commandLabel}
          </span>
        </div>
      }
    >
      <div className="relative flex h-full flex-col overflow-hidden">
        {!hasPreview ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-slate-950/70 px-4 text-center text-[10px] text-slate-300 backdrop-blur">
            <div className="space-y-1">
              <p>WebContainer preview will appear as soon as the dev server reports readiness.</p>
              {errorMessage ? (
                <p className="text-[9px] text-rose-300">{errorMessage}</p>
              ) : lastMessage ? (
                <p className="text-[9px] text-slate-500">{lastMessage}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {hasPreview ? (
          <iframe
            key={previewUrl ?? 'preview'}
            title="Workspace preview"
            src={previewUrl ?? undefined}
            className="h-full w-full border-0 bg-slate-950"
            sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock"
            allow="accelerometer; camera; microphone; clipboard-write"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <iframe
            title="Workspace preview placeholder"
            srcDoc={PREVIEW_HTML}
            className="h-full w-full border-0 bg-slate-950"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        )}
      </div>
    </PanelShell>
  )
}