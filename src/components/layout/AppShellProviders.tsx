'use client'

import { PropsWithChildren } from 'react'

export function AppShellProviders({ children }: PropsWithChildren) {
  return <div className="__app-container">{children}</div>
}
