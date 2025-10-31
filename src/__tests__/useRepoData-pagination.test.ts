import { renderHook, act, waitFor } from '@testing-library/react'
import { useRepoData } from '@/hooks/useRepoData'
import { useAppStore } from '@/state/app-store'
import { GITHUB_TOKEN_KEY } from '@/lib/token'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock Octokit
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listForAuthenticatedUser: jest.fn(),
      },
    },
  })),
}))

import { Octokit } from 'octokit'

const mockOctokit = Octokit as jest.MockedClass<typeof Octokit>

describe('useRepoData Pagination Append', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
    // Reset the store state
    useAppStore.setState({
      repositories: [],
      selectedRepositoryId: undefined,
      repositoryPagination: {
        page: 1,
        perPage: 30,
        hasNextPage: true,
      },
    })
  })

  it('should append repositories to global store instead of replacing', async () => {
    const mockReposPage1 = [
      { 
        id: 1, 
        name: 'repo1', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
      { 
        id: 2, 
        name: 'repo2', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    const mockReposPage2 = [
      { 
        id: 3, 
        name: 'repo3', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    let callCount = 0
    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({
                data: mockReposPage1,
                headers: { 'x-total-count': '3' },
              })
            } else {
              return Promise.resolve({
                data: mockReposPage2,
                headers: { 'x-total-count': '3' },
              })
            }
          }),
        },
      },
    }) as any)

    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData({ perPage: 2 }))

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Check initial state
    expect(result.current.repositories).toHaveLength(2)
    expect(result.current.hasMore).toBe(true)
    
    // Check global store state
    const globalState = useAppStore.getState()
    expect(globalState.repositories).toHaveLength(2)
    expect(globalState.repositoryPagination.page).toBe(1)

    // Fetch next page
    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Verify append behavior
    expect(result.current.repositories).toHaveLength(3)
    expect(result.current.hasMore).toBe(false)
    
    // Verify global store was updated with appended data
    const updatedGlobalState = useAppStore.getState()
    expect(updatedGlobalState.repositories).toHaveLength(3)
    expect(updatedGlobalState.repositories.map(r => r.id)).toEqual(['1', '2', '3'])
    expect(updatedGlobalState.repositoryPagination.page).toBe(2)
    expect(updatedGlobalState.repositoryPagination.hasNextPage).toBe(false)
  })

  it('should dedupe repositories when appending', async () => {
    const mockReposPage1 = [
      { 
        id: 1, 
        name: 'repo1', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    const mockReposPage2 = [
      { 
        id: 1, // Duplicate ID
        name: 'repo1-updated', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-02T00:00:00Z' 
      },
      { 
        id: 2, 
        name: 'repo2', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    let callCount = 0
    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({
                data: mockReposPage1,
                headers: { 'x-total-count': '2' },
              })
            } else {
              return Promise.resolve({
                data: mockReposPage2,
                headers: { 'x-total-count': '2' },
              })
            }
          }),
        },
      },
    }) as any)

    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData({ perPage: 1 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(1)

    // Fetch next page with duplicate
    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should only have 2 repos (duplicate filtered out)
    expect(result.current.repositories).toHaveLength(2)
    
    // Check global store deduplication
    const globalState = useAppStore.getState()
    expect(globalState.repositories).toHaveLength(2)
    
    const repoIds = globalState.repositories.map(r => r.id)
    expect(repoIds).toEqual(['1', '2']) // No duplicates
  })

  it('should reset repositories on refetch', async () => {
    const mockReposPage1 = [
      { 
        id: 1, 
        name: 'repo1', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    const mockReposPage2 = [
      { 
        id: 2, 
        name: 'repo2', 
        owner: { login: 'user' }, 
        default_branch: 'main', 
        updated_at: '2023-01-01T00:00:00Z' 
      },
    ]

    let callCount = 0
    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({
                data: mockReposPage1,
                headers: { 'x-total-count': '2' },
              })
            } else if (callCount === 2) {
              return Promise.resolve({
                data: mockReposPage2,
                headers: { 'x-total-count': '2' },
              })
            } else {
              return Promise.resolve({
                data: mockReposPage1,
                headers: { 'x-total-count': '2' },
              })
            }
          }),
        },
      },
    }) as any)

    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData({ perPage: 1 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(1)

    // Fetch next page
    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(2)

    // Refetch should reset
    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should be back to 1 repo
    expect(result.current.repositories).toHaveLength(1)
    
    // Check global store was reset
    const globalState = useAppStore.getState()
    expect(globalState.repositories).toHaveLength(1)
    expect(globalState.repositoryPagination.page).toBe(1)
  })
})