'use client'

import { ReactNode, useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { LoadingPulse } from '@/components/ui/LoadingPulse'

type PanelShellProps = {
  title: string
  description?: string
  toolbar?: ReactNode
  status?: 'idle' | 'loading' | 'ready' | 'error'
  className?: string
  children: ReactNode
  autoExpand?: boolean
}

export function PanelShell({
  title,
  description,
  toolbar,
  status = 'idle',
  className,
  children,
  autoExpand = false,
}: PanelShellProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!autoExpand || !contentRef.current) return

    // Check if content has meaningful content
    const hasContent = contentRef.current.textContent?.trim() !== '' || 
                      contentRef.current.children.length > 0 ||
                      contentRef.current.innerHTML.includes('img') ||
                      contentRef.current.innerHTML.includes('iframe') ||
                      contentRef.current.innerHTML.includes('canvas') ||
                      contentRef.current.innerHTML.includes('svg')

    setIsExpanded(hasContent)
  }, [autoExpand, children])

  const baseClasses = 'flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/30 backdrop-blur'
  const heightClasses = autoExpand && isExpanded 
    ? 'h-full' 
    : autoExpand 
      ? 'min-h-[180px]' 
      : 'min-h-[180px]'

  return (
    <section
      className={cn(
        baseClasses,
        heightClasses,
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
              {title}
            </h2>
            <StatusBadge status={status} />
          </div>
          {description ? (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          ) : null}
        </div>
        {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
      </header>

      <div className="relative mt-4 flex-1 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/60">
        {status === 'loading' ? <LoadingPulse /> : null}
        <div 
          ref={contentRef}
          className={cn('h-full w-full', status === 'loading' ? 'opacity-50' : undefined)}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

type StatusBadgeProps = {
  status: 'idle' | 'loading' | 'ready' | 'error'
}

function StatusBadge({ status }: StatusBadgeProps) {
  const labelMap: Record<StatusBadgeProps['status'], string> = {
    idle: 'Idle',
    loading: 'Loading',
    ready: 'Ready',
    error: 'Needs attention',
  }

  const colorMap: Record<StatusBadgeProps['status'], string> = {
    idle: 'bg-slate-800 text-slate-300 border border-slate-700',
    loading: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
    ready: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    error: 'bg-rose-500/20 text-rose-300 border border-rose-400/40',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
        colorMap[status],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'ready'
            ? 'bg-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
            : status === 'loading'
              ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
              : status === 'error'
                ? 'bg-rose-300 shadow-[0_0_8px_rgba(244,114,182,0.6)]'
                : 'bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.4)]',
        )}
      />
      {labelMap[status]}
    </span>
  )
}