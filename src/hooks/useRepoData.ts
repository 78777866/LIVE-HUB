'use client'

import { useState, useEffect, useCallback } from 'react'
import { Octokit } from 'octokit'
import { useAppStore, type RepositorySummary } from '@/state/app-store'
import { getToken } from '@/lib/authToken'
import { getGitHubToken } from '@/lib/token'
import { fetchRepositoryManifest, detectWorkspaceTemplate } from '@/lib/workspace-detector'

interface CacheEntry {
  data: RepositorySummary[]
  timestamp: number
  etag?: string
}

interface PaginationInfo {
  page: number
  perPage: number
  totalCount?: number
  hasNextPage: boolean
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = 'github-repos-cache'
const DEFAULT_PER_PAGE = 30

export interface UseRepoDataOptions {
  perPage?: number
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
  type?: 'all' | 'owner' | 'member'
  cache?: boolean
}

export interface UseRepoDataReturn {
  repositories: RepositorySummary[]
  loading: boolean
  error: string | null
  pagination: PaginationInfo
  hasMore: boolean
  fetchNextPage: () => void
  refetch: () => void
  clearCache: () => void
}

export function useRepoData(options: UseRepoDataOptions = {}): UseRepoDataReturn {
  const {
    perPage = DEFAULT_PER_PAGE,
    sort = 'updated',
    direction = 'desc',
    type = 'owner',
    cache = true,
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { 
    repositories,
    setRepositories: setGlobalRepositories, 
    appendRepositories: appendGlobalRepositories,
    setRepositoryPagination: setGlobalPagination,
    repositoryPagination: globalPagination
  } = useAppStore()

  const getFromCache = useCallback((): CacheEntry | null => {
    if (!cache || typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const entry: CacheEntry = JSON.parse(cached)
      const now = Date.now()
      
      if (now - entry.timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      
      return entry
    } catch {
      return null
    }
  }, [cache])

  const saveToCache = useCallback((data: RepositorySummary[], etag?: string) => {
    if (!cache || typeof window === 'undefined') return
    
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        etag,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    } catch {
      // Ignore cache errors
    }
  }, [cache])

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CACHE_KEY)
  }, [])

  const transformRepoData = useCallback(async (repos: any[], token: string): Promise<RepositorySummary[]> => {
    const repositoriesWithData = await Promise.all(
      repos.map(async (repo) => {
        let workspaceTemplateId: import('@/lib/workspace-templates').WorkspaceTemplateId | undefined = undefined
        
        try {
          // Fetch repository manifest for template detection
          const manifest = await fetchRepositoryManifest(repo.owner.login, repo.name, token)
          const detection = detectWorkspaceTemplate(manifest)
          
          if (detection.templateId) {
            workspaceTemplateId = detection.templateId
          }
        } catch (error) {
          console.warn(`Failed to detect template for ${repo.owner.login}/${repo.name}:`, error)
        }

        return {
          id: repo.id.toString(),
          name: repo.name,
          owner: repo.owner.login,
          description: repo.description,
          defaultBranch: repo.default_branch,
          updatedAt: repo.updated_at,
          workspaceTemplateId,
        }
      })
    )
    
    return repositoriesWithData
  }, [])

  const fetchRepositories = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      // Get GitHub token from storage or environment
      const token = getToken() || getGitHubToken() || process.env.NEXT_PUBLIC_GITHUB_TOKEN

      if (!token) {
        throw new Error('GitHub token not found. Please authenticate first.')
      }

      const octokit = new Octokit({ auth: token })

      // Check cache for first page
      if (page === 1 && !append) {
        const cached = getFromCache()
        if (cached) {
          setGlobalRepositories(cached.data)
          setGlobalPagination({
            page: 1,
            hasNextPage: cached.data.length >= perPage,
          })
          setLoading(false)
          return
        }
      }

      const response = await octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        sort,
        direction,
        type,
      })

      const transformedData = await transformRepoData(response.data, token)

      if (append) {
        appendGlobalRepositories(transformedData)
      } else {
        setGlobalRepositories(transformedData)
      }

      // Update pagination in global store
      const totalCount = response.headers['x-total-count'] 
        ? parseInt(response.headers['x-total-count'] as string, 10)
        : undefined

      setGlobalPagination({
        page,
        totalCount,
        hasNextPage: response.data.length >= perPage,
      })

      // Cache first page
      if (page === 1 && !append) {
        const etag = response.headers.etag
        saveToCache(transformedData, etag)
      }

    } catch (err: any) {
      let errorMessage = 'Failed to fetch repositories'
      
      if (err.status === 401) {
        errorMessage = 'Authentication failed. Please check your GitHub token.'
      } else if (err.status === 403) {
        errorMessage = 'API rate limit exceeded. Please try again later.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [perPage, sort, direction, type, getFromCache, saveToCache, transformRepoData, setGlobalRepositories, appendGlobalRepositories, setGlobalPagination])

  const fetchNextPage = useCallback(() => {
    if (globalPagination.hasNextPage && !loading) {
      fetchRepositories(globalPagination.page + 1, true)
    }
  }, [globalPagination.page, globalPagination.hasNextPage, loading, fetchRepositories])

  const refetch = useCallback(() => {
    clearCache()
    fetchRepositories(1, false)
  }, [clearCache, fetchRepositories])

  // Initial fetch
  useEffect(() => {
    fetchRepositories(1, false)
  }, [fetchRepositories])

  return {
    repositories,
    loading,
    error,
    pagination: globalPagination,
    hasMore: globalPagination.hasNextPage,
    fetchNextPage,
    refetch,
    clearCache,
  }
}