'use client'

import { useState } from 'react'
import { SessionPanel } from '@/components/panels/SessionPanel'
import { RepositoryPanel } from '@/components/panels/RepositoryPanel'
import { FileTreePanel } from '@/components/panels/FileTreePanel'
import { cn } from '@/lib/utils'

type SidebarProps = {
  className?: string
}

type ActivePanel = 'session' | 'repository' | 'filetree' | null

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const getPanelIcon = (panelType: ActivePanel) => {
    switch (panelType) {
      case 'session':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'repository':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      case 'filetree':
        return (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative flex h-full">
      <aside 
        className={cn(
          'flex border-r border-slate-800/80 bg-slate-900/60 backdrop-blur z-20',
          isCollapsed ? 'w-16' : 'w-80',
          className
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 p-4">
            {!isCollapsed && (
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                Workspace
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <SessionPanel />
              <RepositoryPanel />
              <FileTreePanel />
            </div>
          )}
          
          {isCollapsed && (
            <div className="flex flex-col items-center gap-4 p-4">
              <button 
                onClick={() => setActivePanel(activePanel === 'session' ? null : 'session')}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  activePanel === 'session' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                )}
                aria-label="Session"
              >
                {getPanelIcon('session')}
              </button>
              <button 
                onClick={() => setActivePanel(activePanel === 'repository' ? null : 'repository')}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  activePanel === 'repository' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                )}
                aria-label="Repositories"
              >
                {getPanelIcon('repository')}
              </button>
              <button 
                onClick={() => setActivePanel(activePanel === 'filetree' ? null : 'filetree')}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  activePanel === 'filetree' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                )}
                aria-label="File Tree"
              >
                {getPanelIcon('filetree')}
              </button>
            </div>
          )}
        </div>
      </aside>
      
      {/* Overlay panel for collapsed state */}
      {isCollapsed && activePanel && (
        <div className="absolute left-16 top-0 h-full w-80 bg-slate-900/90 backdrop-blur border-r border-slate-800/80 z-10">
          <div className="p-4 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                {activePanel === 'session' && 'Session'}
                {activePanel === 'repository' && 'Repository'}
                {activePanel === 'filetree' && 'File Tree'}
              </h2>
              <button
                onClick={() => setActivePanel(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                aria-label="Close panel"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
            {activePanel === 'session' && <SessionPanel />}
            {activePanel === 'repository' && <RepositoryPanel />}
            {activePanel === 'filetree' && <FileTreePanel />}
          </div>
        </div>
      )}
    </div>
  )
}