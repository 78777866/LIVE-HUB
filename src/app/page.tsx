'use client'

import { EditorPanel } from '@/components/panels/EditorPanel'
import { ConsolePanel } from '@/components/panels/ConsolePanel'
import { PreviewPanel } from '@/components/panels/PreviewPanel'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAppStore } from '@/state/app-store'

export default function HomePage() {
  const sessionStatus = useAppStore((state) => state.session.status)
  const selectedRepository = useAppStore((state) =>
    state.repositories.find((repository) => repository.id === state.selectedRepositoryId),
  )
  const webContainerStatus = useAppStore((state) => state.webContainer.status)
  const webContainerStatusLabel = webContainerStatus.replace(/-/g, ' ')

  return (
    <main id="main-content" className="flex min-h-screen flex-col">
      <header className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/40 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              LiveHub Playground
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Client-first workspace scaffold
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-slate-400">
            {/* Status pills will go here */}
          </div>
        </div>
        <p className="text-sm text-slate-400 md:max-w-2xl">
          This view establishes the responsive layout, state scaffolding, and placeholder UI elements
          for LiveHub. Future tickets can wire authentication, repository browsing, WebContainer boot,
          Monaco editor integration, and live previews without restructuring the page.
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_380px] xl:grid-rows-[minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col gap-4">
              <EditorPanel />
              <ConsolePanel />
            </div>
            <div className="min-h-[320px]">
              <PreviewPanel />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800/80 bg-slate-950/70 p-4 text-xs uppercase tracking-[0.45em] text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Next.js 15 · React 18 · Tailwind CSS · Zustand · WebContainers-ready</span>
          <span>Placeholder scaffolding · No server components</span>
        </div>
      </footer>
    </main>
  )
}