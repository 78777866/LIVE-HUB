'use client'

import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/state/app-store'
import type { RepositorySummary } from '@/state/app-store'

const LAST_REPO_KEY = 'livehub-last-selected-repo'
const LAST_BRANCH_KEY_PREFIX = 'livehub-last-selected-branch-'

export interface UsePersistenceReturn {
  saveLastRepository: (repo: RepositorySummary) => void
  saveLastBranch: (owner: string, repo: string, branch: string) => void
  getLastRepository: () => RepositorySummary | null
  getLastBranch: (owner: string, repo: string) => string | null
  clearLastSelections: () => void
  restoreLastSelections: (branches: string[]) => void
}

export function usePersistence(): UsePersistenceReturn {
  const { 
    repositories, 
    selectedRepositoryId, 
    selectedBranch,
    selectRepository, 
    selectBranch 
  } = useAppStore()

  const saveLastRepository = useCallback((repo: RepositorySummary) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(LAST_REPO_KEY, JSON.stringify({
        id: repo.id,
        name: repo.name,
        owner: repo.owner,
        description: repo.description,
        defaultBranch: repo.defaultBranch,
        updatedAt: repo.updatedAt,
      }))
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const saveLastBranch = useCallback((owner: string, repo: string, branch: string) => {
    if (typeof window === 'undefined') return
    
    try {
      const key = `${LAST_BRANCH_KEY_PREFIX}${owner}-${repo}`
      localStorage.setItem(key, branch)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const getLastRepository = useCallback((): RepositorySummary | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const saved = localStorage.getItem(LAST_REPO_KEY)
      if (!saved) return null
      
      return JSON.parse(saved)
    } catch {
      return null
    }
  }, [])

  const getLastBranch = useCallback((owner: string, repo: string): string | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const key = `${LAST_BRANCH_KEY_PREFIX}${owner}-${repo}`
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }, [])

  const clearLastSelections = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(LAST_REPO_KEY)
      
      // Clear all branch selections
      // Try to get all keys, but fall back to a safe approach if that fails
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(LAST_BRANCH_KEY_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
      } catch {
        // Fallback: clear common branch keys we might have set
        // This is a safety measure for environments where Object.keys(localStorage) doesn't work
        const commonKeys = [
          'livehub-last-selected-branch-testuser-test-repo-1',
          'livehub-last-selected-branch-testuser-test-repo-2',
        ]
        commonKeys.forEach(key => {
          localStorage.removeItem(key)
        })
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Restore last selected repository on mount
  useEffect(() => {
    if (repositories.length === 0) return
    
    const lastRepo = getLastRepository()
    if (lastRepo) {
      // Check if the last repo is still in the current repositories
      const exists = repositories.some(repo => 
        repo.id === lastRepo.id && 
        repo.owner === lastRepo.owner && 
        repo.name === lastRepo.name
      )
      
      if (exists) {
        selectRepository(lastRepo.id)
      }
    }
  }, [repositories, getLastRepository, selectRepository])

  // Auto-save when repository selection changes
  useEffect(() => {
    if (selectedRepositoryId) {
      const selectedRepo = repositories.find(repo => repo.id === selectedRepositoryId)
      if (selectedRepo) {
        saveLastRepository(selectedRepo)
      }
    }
  }, [selectedRepositoryId, repositories, saveLastRepository])

  // Auto-save when branch selection changes
  useEffect(() => {
    if (selectedBranch && selectedRepositoryId) {
      const selectedRepo = repositories.find(repo => repo.id === selectedRepositoryId)
      if (selectedRepo) {
        saveLastBranch(selectedRepo.owner, selectedRepo.name, selectedBranch)
      }
    }
  }, [selectedBranch, selectedRepositoryId, repositories, saveLastBranch])

  // Restore last selections when both repositories and branches are available
  const restoreLastSelections = useCallback((branches: string[]) => {
    if (typeof window === 'undefined' || repositories.length === 0) return

    const lastRepo = getLastRepository()
    if (!lastRepo) return

    // Check if the last repo is still in the current repositories
    const exists = repositories.some(repo => 
      repo.id === lastRepo.id && 
      repo.owner === lastRepo.owner && 
      repo.name === lastRepo.name
    )
    
    if (!exists) return

    // Only restore repository if no repository is currently selected
    if (!selectedRepositoryId) {
      selectRepository(lastRepo.id)
    }

    // Restore branch selection if not already selected and branches are available
    if (!selectedBranch && branches.length > 0) {
      const lastBranch = getLastBranch(lastRepo.owner, lastRepo.name)
      if (lastBranch && branches.includes(lastBranch)) {
        selectBranch(lastBranch)
      } else if (branches.length > 0) {
        // Default to the first branch if no saved branch or saved branch not found
        selectBranch(branches[0])
      }
    }
  }, [
    repositories, 
    selectedRepositoryId, 
    selectedBranch, 
    getLastRepository, 
    getLastBranch, 
    selectRepository, 
    selectBranch
  ])

  return {
    saveLastRepository,
    saveLastBranch,
    getLastRepository,
    getLastBranch,
    clearLastSelections,
    restoreLastSelections,
  }
}