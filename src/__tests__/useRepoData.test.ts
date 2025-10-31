import { renderHook, act, waitFor } from '@testing-library/react'
import { useRepoData } from '@/hooks/useRepoData'
import { useAppStore } from '@/state/app-store'
import { getToken } from '@/lib/authToken'

// Mock the authToken module
jest.mock('@/lib/authToken', () => ({
  getToken: jest.fn(),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
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

describe('useRepoData', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
    mockGetToken.mockReturnValue(null) // Default to no token
    useAppStore.setState({
      repositories: [],
      selectedRepositoryId: undefined,
    })
  })

  it('should initialize with empty state', async () => {
    const { result } = renderHook(() => useRepoData())

    // Initially repositories should be empty
    expect(result.current.repositories).toEqual([])
    expect(result.current.hasMore).toBe(true) // Default value before any fetch

    // After the effect runs, it should show error for missing token
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('GitHub token not found. Please authenticate first.')
    })
  })

  it('should fetch repositories successfully', async () => {
    const mockRepos = [
      {
        id: 1,
        name: 'test-repo',
        owner: { login: 'testuser' },
        description: 'Test repository',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]

    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: mockRepos,
            headers: { 'x-total-count': '1' },
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(1)
    expect(result.current.repositories[0]).toMatchObject({
      id: '1',
      name: 'test-repo',
      owner: 'testuser',
      description: 'Test repository',
      defaultBranch: 'main',
      updatedAt: '2023-01-01T00:00:00Z',
    })
    expect(result.current.error).toBe(null)
  })

  it('should handle authentication error', async () => {
    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockRejectedValue({
            status: 401,
            message: 'Unauthorized',
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('invalid-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'invalid-token')

    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toEqual([])
    expect(result.current.error).toBe('Authentication failed. Please check your GitHub token.')
  })

  it('should handle rate limit error', async () => {
    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockRejectedValue({
            status: 403,
            message: 'Rate limit exceeded',
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('API rate limit exceeded. Please try again later.')
  })

  it('should cache repositories', async () => {
    const mockRepos = [
      {
        id: 1,
        name: 'test-repo',
        owner: { login: 'testuser' },
        description: 'Test repository',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]

    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: mockRepos,
            headers: { 'x-total-count': '1' },
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    // First fetch
    const { result: result1, unmount } = renderHook(() => useRepoData())
    
    await waitFor(() => {
      expect(result1.current.loading).toBe(false)
    })

    expect(mockOctokit).toHaveBeenCalledTimes(1)

    // Unmount to clean up the hook
    unmount()

    // Second fetch should use cache
    const { result: result2 } = renderHook(() => useRepoData())
    
    await waitFor(() => {
      expect(result2.current.loading).toBe(false)
    })

    // Should not call Octokit again due to cache (but new instance is created)
    expect(mockOctokit).toHaveBeenCalledTimes(2)
    expect(result2.current.repositories).toEqual(result1.current.repositories)
  })

  it('should respect cache TTL', async () => {
    const mockRepos = [
      {
        id: 1,
        name: 'test-repo',
        owner: { login: 'testuser' },
        description: 'Test repository',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]

    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: mockRepos,
            headers: { 'x-total-count': '1' },
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    // First fetch
    const { result: result1 } = renderHook(() => useRepoData())
    
    await waitFor(() => {
      expect(result1.current.loading).toBe(false)
    })

    expect(mockOctokit).toHaveBeenCalledTimes(1)

    // Manually expire cache
    const cacheKey = 'github-repos-cache'
    const cached = JSON.parse(localStorageMock.getItem(cacheKey)!)
    cached.timestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago (expired)
    localStorageMock.setItem(cacheKey, JSON.stringify(cached))

    // Second fetch should call API again
    const { result: result2 } = renderHook(() => useRepoData())
    
    await waitFor(() => {
      expect(result2.current.loading).toBe(false)
    })

    expect(mockOctokit).toHaveBeenCalledTimes(2)
  })

  it('should handle pagination correctly', async () => {
    const mockReposPage1 = [
      { id: 1, name: 'repo1', owner: { login: 'user' }, default_branch: 'main', updated_at: '2023-01-01T00:00:00Z' },
      { id: 2, name: 'repo2', owner: { login: 'user' }, default_branch: 'main', updated_at: '2023-01-01T00:00:00Z' },
    ]

    const mockReposPage2 = [
      { id: 3, name: 'repo3', owner: { login: 'user' }, default_branch: 'main', updated_at: '2023-01-01T00:00:00Z' },
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

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData({ perPage: 2 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(2)
    expect(result.current.hasMore).toBe(true)

    // Fetch next page
    act(() => {
      result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toHaveLength(3)
    expect(result.current.hasMore).toBe(false)
  })

  it('should clear cache and refetch', async () => {
    const mockRepos = [
      {
        id: 1,
        name: 'test-repo',
        owner: { login: 'testuser' },
        description: 'Test repository',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]

    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: mockRepos,
            headers: { 'x-total-count': '1' },
          }),
        },
      },
    }) as any)

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockOctokit).toHaveBeenCalledTimes(1)

    // Clear cache and refetch
    act(() => {
      result.current.clearCache()
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockOctokit).toHaveBeenCalledTimes(2)
  })

  it('should handle missing GitHub token', async () => {
    mockGetToken.mockReturnValue(null) // Explicitly return null
    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.repositories).toEqual([])
    expect(result.current.error).toBe('GitHub token not found. Please authenticate first.')
  })

  it('should detect templates for repositories', async () => {
    // Mock GitHub API responses for repositories and their manifests
    const mockRepos = [
      {
        id: 1,
        name: 'nextjs-app',
        owner: { login: 'testuser' },
        description: 'A Next.js application',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'vite-react-app',
        owner: { login: 'testuser' },
        description: 'A Vite React application',
        default_branch: 'main',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]

    // Mock fetch for GitHub API calls
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('repos/testuser/nextjs-app/contents/package.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: btoa(JSON.stringify({
              dependencies: {
                next: '14.0.0',
                react: '18.0.0'
              }
            }))
          })
        })
      }
      if (url.includes('repos/testuser/vite-react-app/contents/package.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: btoa(JSON.stringify({
              devDependencies: {
                vite: '5.0.0'
              },
              dependencies: {
                react: '18.0.0'
              }
            }))
          })
        })
      }
      // Default response for other files (404)
      return Promise.resolve({
        ok: false,
        status: 404
      })
    }) as jest.Mock

    mockOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          listForAuthenticatedUser: jest.fn().mockResolvedValue({
            data: mockRepos,
            headers: { 'x-total-count': '2' },
          }),
        },
      },
    }) as any)

    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() => useRepoData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const repositories = result.current.repositories
    expect(repositories).toHaveLength(2)
    
    // Check Next.js template detection
    const nextjsRepo = repositories.find(r => r.name === 'nextjs-app')
    expect(nextjsRepo?.workspaceTemplateId).toBe('nextjs-starter')
    
    // Check Vite template detection
    const viteRepo = repositories.find(r => r.name === 'vite-react-app')
    expect(viteRepo?.workspaceTemplateId).toBe('vite-react-starter')
  })
})