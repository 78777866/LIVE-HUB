'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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
          'flex border-r border-slate-800/80 bg-slate-900/60 backdrop-blur z-20 transition-all duration-slow',
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
              className="rounded-lg p-2 text-slate-400 transition-colors duration-default hover:bg-slate-800/50 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default"
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
              <div className="border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-3 w-full rounded-lg p-3 text-slate-300 transition-colors duration-default hover:bg-slate-800/50 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Settings</span>
                </button>
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <div className="flex flex-col items-center gap-4 p-4">
              <button 
                onClick={() => setActivePanel(activePanel === 'session' ? null : 'session')}
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default",
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
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default",
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
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default",
                  activePanel === 'filetree' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                )}
                aria-label="File Tree"
              >
                {getPanelIcon('filetree')}
              </button>
              <div className="border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-800/50 text-slate-300 transition-colors duration-default hover:bg-slate-700/50 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default"
                  aria-label="Settings"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
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