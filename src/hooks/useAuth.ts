'use client'

import { useGitHubAuth } from './useGitHubAuth'

export { useGitHubAuth as useAuth } from './useGitHubAuth'
export type UseAuthReturn = ReturnType<typeof useGitHubAuth>
