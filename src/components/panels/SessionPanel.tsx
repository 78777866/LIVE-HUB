// @ts-nocheck
'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { PanelShell } from '@/components/panels/PanelShell'
import { useGitHubAuth } from '@/hooks/useGitHubAuth'
import { cn } from '@/lib/utils'

export function SessionPanel() {
  const { session, isAuthenticated, loading, error, code, initiateDeviceFlow, signOut } = useGitHubAuth()

  const panelStatus = useMemo(() => {
    if (loading) return 'loading' as const
    if (session.status === 'error' || error) return 'error' as const
    if (isAuthenticated) return 'ready' as const
    return 'idle' as const
  }, [error, isAuthenticated, loading, session.status])

  const primaryLabel = isAuthenticated ? 'Sign out' : 'Connect'
  const errorMessage = error ?? (session.status === 'error' ? session.message : undefined)
  const displayMessage = !errorMessage ? session.message : undefined

  function handlePrimaryAction() {
    if (loading) {
      return
    }

    if (session.status === 'authenticated') {
      signOut()
      return
    }

    initiateDeviceFlow()
  }

  return (
    <PanelShell
      title="Session"
      status={panelStatus}
      autoExpand={true}
    >
      <div className="flex h-full flex-col justify-between gap-3 p-2">
        <div>
          {displayMessage ? (
            <p className="text-[10px] text-slate-300 truncate">{displayMessage}</p>
          ) : null}

          {session.status === 'authenticating' ? (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-center">
              <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400">Device Code</p>
              <p className="mt-1 text-lg font-bold tracking-[0.1em] text-slate-100">
                {code ?? 'Loading...'}
              </p>
              <p className="mt-1 text-[9px] text-slate-500 truncate">
                Enter at{' '}
                <span className="font-semibold text-slate-200">
                  {session.verificationUri ?? 'github.com/login/device'}
                </span>
              </p>
            </div>
          ) : null}

          {session.status === 'authenticated' && session.user ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2">
              {session.user.avatarUrl ? (
                <Image
                  src={session.user.avatarUrl}
                  alt={session.user.name || ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-xs font-semibold text-white">
                  {(session.user.name || '')
                    .split(' ')
                    .map((segment) => segment.charAt(0))
                    .join('')}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-slate-100 truncate text-xs">{session.user.name}</p>
                <p className="text-[9px] text-slate-400 truncate">@{session.user.handle}</p>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-2 rounded-lg border border-rose-500/50 bg-rose-500/10 p-2 text-[10px] text-rose-200">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handlePrimaryAction}
          className={cn(
            'group inline-flex items-center justify-center rounded-lg border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-100 transition',
            isAuthenticated
              ? 'border-emerald-500/50 bg-emerald-500/15 hover:border-emerald-400 hover:bg-emerald-500/25'
              : 'border-slate-600 bg-slate-800/70 hover:border-slate-400 hover:bg-slate-700',
            loading && 'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500'
          )}
        >
          {loading ? 'Loading...' : primaryLabel}
        </button>
      </div>
    </PanelShell>
  )
}