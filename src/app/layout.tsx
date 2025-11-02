'use client'

import { ReactNode } from 'react'
import './globals.css'
import { AppShellProviders } from '@/components/layout/AppShellProviders'
import { SkipLink } from '@/components/ui/SkipLink'

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <AppShellProviders>{children}</AppShellProviders>
      </body>
    </html>
  )
}
