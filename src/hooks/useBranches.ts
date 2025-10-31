'use client'

import { useState, useEffect, useCallback } from 'react'
import { Octokit } from 'octokit'
import { useAppStore } from '@/state/app-store'
import { usePersistence } from '@/hooks/usePersistence'
import { getToken } from '@/lib/authToken'
import { getGitHubToken } from '@/lib/token'

export interface BranchCommitMetadata {
  sha: string
  url: string
  message: string
  committedDate: string
  authorName?: string
}

export interface Branch {
  name: string
  commit: BranchCommitMetadata
  protected: boolean
}

interface UseBranchesOptions {
  owner: string
  repo: string
  repositoryId?: string
  defaultBranch?: string
  cache?: boolean
}

interface CacheEntry {
  data: Branch[]
  timestamp: number
}

const CACHE_TTL = 2 * 60 * 1000 // 2 minutes for branches
const BRANCH_PERSIST_KEY_PREFIX = 'selected-branch-'
const LEGACY_BRANCH_PERSIST_KEY_PREFIX = 'livehub-last-selected-branch-'

export interface UseBranchesReturn {
  branches: Branch[]
  loading: boolean
  error: string | null
  selectedBranch: string | null
  setSelectedBranch: (branch: string) => void
  refetch: () => void
  clearCache: () => void
}

export function useBranches({
  owner,
  repo,
  repositoryId,
  defaultBranch,
  cache = true,
}: UseBranchesOptions): UseBranchesReturn {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use centralized store for branch selection
  const selectedBranch = useAppStore((state) => state.selectedBranch)
  const selectBranch = useAppStore((state) => state.selectBranch)
  const { restoreLastSelections, getLastBranch } = usePersistence()

  const getCacheKey = useCallback(() => `github-branches-${owner}-${repo}`, [owner, repo])

  const getFromCache = useCallback((): CacheEntry | null => {
    if (!cache || typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(getCacheKey())
      if (!cached) return null

      const entry: CacheEntry = JSON.parse(cached)
      const now = Date.now()

      if (now - entry.timestamp > CACHE_TTL) {
        localStorage.removeItem(getCacheKey())
        return null
      }

      return entry
    } catch {
      return null
    }
  }, [cache, getCacheKey])

  const saveToCache = useCallback(
    (data: Branch[]) => {
      if (!cache || typeof window === 'undefined') return

      try {
        const entry: CacheEntry = {
          data,
          timestamp: Date.now(),
        }
        localStorage.setItem(getCacheKey(), JSON.stringify(entry))
      } catch {
        // Ignore cache errors
      }
    },
    [cache, getCacheKey],
  )

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(getCacheKey())
  }, [getCacheKey])

  const setSelectedBranch = useCallback((branch: string) => {
    selectBranch(branch)
    // Persistence is now handled by the usePersistence hook
  }, [selectBranch])

  const fetchBranches = useCallback(async () => {
    if (!owner || !repo) {
      setBranches([])
      setError(null)
      setLoading(false)
      if (repositoryId) {
        clearBranchSelection(repositoryId)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get GitHub token from storage or environment
      const token = getToken() || getGitHubToken() || process.env.NEXT_PUBLIC_GITHUB_TOKEN

      if (!token) {
        throw new Error('GitHub token not found. Please authenticate first.')
      }

      const cached = getFromCache()
      if (cached) {
        setBranches(cached.data)
        setLoading(false)
        return
      }

      const octokit = new Octokit({ auth: token })

      const response = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      })

      setBranches(response.data)
      saveToCache(response.data)

      // Use centralized persistence to restore selections
      const branchNames = response.data.map(branch => branch.name)
      restoreLastSelections(branchNames)
      
      // If no branch is selected after restoration, default to first branch
      if (!selectedBranch && response.data.length > 0) {
        selectBranch(response.data[0].name)
      }

      // Enrich branches with commit metadata
      const branchesWithMetadata = await Promise.all(
        response.data.map(async (baseBranch) => {
          try {
            const commitResponse = await octokit.rest.repos.getCommit({
              owner,
              repo,
              ref: baseBranch.commit.sha,
            })

            const commitData = commitResponse.data
            const message = commitData.commit.message ?? ''
            const committedDate =
              commitData.commit.author?.date ?? commitData.commit.committer?.date ?? ''
            const authorName =
              commitData.commit.author?.name ?? commitData.commit.committer?.name ?? undefined

            return {
              ...baseBranch,
              commit: {
                sha: commitData.sha,
                url: commitData.html_url ?? baseBranch.commit.url,
                message,
                committedDate,
                authorName,
              },
            }
          } catch {
            return baseBranch
          }
        }),
      )

      setBranches(branchesWithMetadata)
      saveToCache(branchesWithMetadata)
    } catch (err: any) {
      let errorMessage = 'Failed to fetch branches'

      if (err.status === 401) {
        errorMessage = 'Authentication failed. Please check your GitHub token.'
      } else if (err.status === 403) {
        errorMessage = 'API rate limit exceeded. Please try again later.'
      } else if (err.status === 404) {
        errorMessage = 'Repository not found or you do not have access to it.'
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setBranches([])
      if (repositoryId) {
        clearBranchSelection(repositoryId)
      }
    } finally {
      setLoading(false)
    }
  }, [owner, repo, repositoryId, getFromCache, saveToCache, restoreLastSelections, selectedBranch, selectBranch])

  const clearBranchSelection = useCallback((repositoryId: string) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(`${BRANCH_PERSIST_KEY_PREFIX}${repositoryId}`)
      localStorage.removeItem(`${LEGACY_BRANCH_PERSIST_KEY_PREFIX}${owner}-${repo}`)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const setBranchSelection = useCallback((repositoryId: string, branch: string) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(`${BRANCH_PERSIST_KEY_PREFIX}${repositoryId}`, branch)
      localStorage.setItem(`${LEGACY_BRANCH_PERSIST_KEY_PREFIX}${owner}-${repo}`, branch)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const getBranchSelection = useCallback((repositoryId: string): string | null => {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(`${BRANCH_PERSIST_KEY_PREFIX}${repositoryId}`) ??
        localStorage.getItem(`${LEGACY_BRANCH_PERSIST_KEY_PREFIX}${owner}-${repo}`)
    } catch {
      return null
    }
  }, [])

  const persistSelectedBranch = useCallback((branch: string | null) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem('livehub-selected-branch', branch)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const refetch = useCallback(() => {
    clearCache()
    void fetchBranches()
  }, [clearCache, fetchBranches])

  useEffect(() => {
    if (!repositoryId) {
      return
    }

    setBranches([])
  }, [repositoryId])

  useEffect(() => {
    if (owner && repo) {
      void fetchBranches()
    } else {
      setBranches([])
    }
  }, [owner, repo, fetchBranches])

  useEffect(() => {
    if (!repositoryId || branches.length === 0) {
      return
    }

    const availableBranches = new Set(branches.map((branch) => branch.name))
    const currentSelection = getLastBranch(owner, repo)

    const persistedSelection =
      typeof window !== 'undefined' && owner && repo
        ? localStorage.getItem(`${BRANCH_PERSIST_KEY_PREFIX}${owner}-${repo}`) ??
          localStorage.getItem(`${LEGACY_BRANCH_PERSIST_KEY_PREFIX}${owner}-${repo}`)
        : null

    const candidates = [
      currentSelection,
      persistedSelection ?? undefined,
      defaultBranch,
      branches[0]?.name,
    ]

    const nextSelection = candidates.find((candidate): candidate is string => {
      if (!candidate) {
        return false
      }

      return availableBranches.has(candidate)
    })

    if (nextSelection) {
      if (nextSelection !== currentSelection) {
        setBranchSelection(repositoryId, nextSelection)
      }
      persistSelectedBranch(nextSelection)
    } else if (currentSelection) {
      clearBranchSelection(repositoryId)
      persistSelectedBranch(null)
    }
  }, [
    branches,
    repositoryId,
    owner,
    repo,
    defaultBranch,
    selectBranch,
  ])

  useEffect(() => {
    if (!repositoryId) {
      return
    }

    persistSelectedBranch(selectedBranch)
  }, [repositoryId, selectedBranch])

  return {
    branches,
    loading,
    error,
    selectedBranch,
    setSelectedBranch,
    refetch,
    clearCache,
  }
}
