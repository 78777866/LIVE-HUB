'use client'

export function LoadingPulse() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-500 animate-ping" />
        Loading
      </div>
    </div>
  )
}
