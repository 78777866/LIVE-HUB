'use client'

import { PropsWithChildren } from 'react'
import { ThemeProvider } from 'next-themes'

export function AppShellProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="__app-container">{children}</div>
    </ThemeProvider>
  )
}
