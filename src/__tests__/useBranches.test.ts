import { renderHook, act, waitFor } from '@testing-library/react'
import { useBranches } from '../hooks/useBranches'
import { GITHUB_TOKEN_KEY } from '../lib/token'
import { resetAppStore, useAppStore } from '../state/app-store'
import { getToken } from '@/lib/authToken'

// Mock the authToken module
jest.mock('@/lib/authToken', () => ({
  getToken: jest.fn(),
}))

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>

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

const listBranchesMock = jest.fn()
const getCommitMock = jest.fn()

jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        listBranches: listBranchesMock,
        getCommit: getCommitMock,
      },
    },
  })),
}))

const owner = 'testuser'
const repo = 'test-repo'
const repositoryId = 'repo-123'
const defaultBranch = 'main'

function createBranchList() {
  return [
    {
      name: 'main',
      commit: { sha: 'abc123', url: `https://api.github.com/repos/${owner}/${repo}/commits/abc123` },
      protected: false,
    },
    {
      name: 'develop',
      commit: { sha: 'def456', url: `https://api.github.com/repos/${owner}/${repo}/commits/def456` },
      protected: true,
    },
  ]
}

function mockSuccessfulBranchFetch(branches = createBranchList()) {
  listBranchesMock.mockResolvedValue({ data: branches })
  getCommitMock.mockImplementation(({ ref }: { ref: string }) =>
    Promise.resolve({
      data: {
        sha: ref,
        html_url: `https://github.com/${owner}/${repo}/commit/${ref}`,
        commit: {
          message: `Commit message for ${ref}`,
          author: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
          committer: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
        },
      },
    }),
  )
  return branches
}

function setToken(token = 'test-token') {
  localStorageMock.setItem(GITHUB_TOKEN_KEY, token)
}

describe('useBranches', () => {
  beforeEach(() => {
    localStorageMock.clear()
    listBranchesMock.mockReset()
    getCommitMock.mockReset()
    resetAppStore()
    jest.clearAllMocks()
    mockGetToken.mockReturnValue(null) // Default to no token
  })

  it('initializes with empty state when repository details are missing', async () => {
    const { result } = renderHook(() => useBranches({ owner: '', repo: '' }))

    expect(result.current.branches).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.selectedBranch).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listBranchesMock).not.toHaveBeenCalled()
  })

  it('fetches branches and enriches commit metadata', async () => {
    setToken()
    const apiBranches = mockSuccessfulBranchFetch()

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listBranchesMock).toHaveBeenCalledTimes(1)
    expect(getCommitMock).toHaveBeenCalledTimes(apiBranches.length)

    expect(result.current.branches).toEqual([
      {
        name: 'main',
        protected: false,
        commit: {
          sha: 'abc123',
          url: `https://github.com/${owner}/${repo}/commit/abc123`,
          message: 'Commit message for abc123',
          committedDate: '2024-01-01T00:00:00Z',
          authorName: 'Test Author',
        },
      },
      {
        name: 'develop',
        protected: true,
        commit: {
          sha: 'def456',
          url: `https://github.com/${owner}/${repo}/commit/def456`,
          message: 'Commit message for def456',
          committedDate: '2024-01-01T00:00:00Z',
          authorName: 'Test Author',
        },
      },
    ])

    expect(result.current.selectedBranch).toBe('main')
    expect(
      useAppStore.getState().getSelectedBranchForRepository(repositoryId),
    ).toBe('main')
  })

  it('handles authentication errors gracefully', async () => {
    setToken('invalid')
    listBranchesMock.mockRejectedValue({ status: 401, message: 'Unauthorized' })
    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(
      'Authentication failed. Please check your GitHub token.',
    )
    expect(result.current.branches).toEqual([])
    expect(useAppStore.getState().getSelectedBranchForRepository(repositoryId)).toBeUndefined()
  })

  it('handles repository not found errors', async () => {
    setToken()
    listBranchesMock.mockRejectedValue({ status: 404, message: 'Not Found' })

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(
      'Repository not found or you do not have access to it.',
    )
    expect(result.current.branches).toEqual([])
    expect(useAppStore.getState().getSelectedBranchForRepository(repositoryId)).toBeUndefined()
  })

  it('should handle authentication error', async () => {
    listBranchesMock.mockRejectedValue({
      status: 401,
      message: 'Unauthorized',
    })

    mockGetToken.mockReturnValue('invalid-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'invalid-token')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(
      'Authentication failed. Please check your GitHub token.',
    )
    expect(result.current.branches).toEqual([])
  })

  it('should handle repository not found error', async () => {
    listBranchesMock.mockRejectedValue({
      status: 404,
      message: 'Not Found',
    })

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(
      'Repository not found or you do not have access to it.',
    )
    expect(result.current.branches).toEqual([])
  })

  it('restores the selected branch from storage', async () => {
    setToken()
    mockSuccessfulBranchFetch()
    localStorageMock.setItem('selected-branch-testuser-test-repo', 'develop')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.selectedBranch).toBe('develop')
  })

  it('should restore selected branch from localStorage', async () => {
    const mockBranches = [
      {
        name: 'main',
        commit: { sha: 'abc123', url: 'https://api.github.com/repos/test/repo/commits/abc123' },
        protected: false,
      },
      {
        name: 'develop',
        commit: { sha: 'def456', url: 'https://api.github.com/repos/test/repo/commits/def456' },
        protected: true,
      },
    ]

    listBranchesMock.mockResolvedValue({ data: mockBranches })
    getCommitMock.mockImplementation(({ ref }: { ref: string }) =>
      Promise.resolve({
        data: {
          sha: ref,
          html_url: `https://github.com/${owner}/${repo}/commit/${ref}`,
          commit: {
            message: `Commit message for ${ref}`,
            author: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
            committer: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
          },
        },
      }),
    )

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')
    localStorageMock.setItem('selected-branch-testuser-test-repo', 'develop')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.selectedBranch).toBe('develop')
  })

  it('should save selected branch to localStorage', async () => {
    const mockBranches = [
      {
        name: 'main',
        commit: { sha: 'abc123', url: 'https://api.github.com/repos/test/repo/commits/abc123' },
        protected: false,
      },
      {
        name: 'develop',
        commit: { sha: 'def456', url: 'https://api.github.com/repos/test/repo/commits/def456' },
        protected: true,
      },
    ]

    listBranchesMock.mockResolvedValue({ data: mockBranches })
    getCommitMock.mockImplementation(({ ref }: { ref: string }) =>
      Promise.resolve({
        data: {
          sha: ref,
          html_url: `https://github.com/${owner}/${repo}/commit/${ref}`,
          commit: {
            message: `Commit message for ${ref}`,
            author: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
            committer: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
          },
        },
      }),
    )

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setSelectedBranch('develop')
    })

    expect(localStorageMock.getItem('selected-branch-testuser-test-repo')).toBe(
      'develop',
    )
    expect(
      localStorageMock.getItem('livehub-last-selected-branch-testuser-test-repo'),
    ).toBe('develop')
  })

  it('should not fetch when owner or repo missing', async () => {
    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')
    
    const { result } = renderHook(() => useBranches({ owner: '', repo: '' }))

    // Should not fetch anything when owner/repo are empty
    expect(result.current.loading).toBe(false) // No loading since useEffect doesn't run
    expect(result.current.error).toBe(null)
    expect(result.current.branches).toEqual([])
    expect(result.current.selectedBranch).toBe(null)
  })

  it('should clear cache and refetch', async () => {
    const mockBranches = [
      {
        name: 'main',
        commit: { sha: 'abc123', url: 'https://api.github.com/repos/test/repo/commits/abc123' },
        protected: false,
      },
    ]

    listBranchesMock.mockResolvedValue({ data: mockBranches })
    getCommitMock.mockImplementation(({ ref }: { ref: string }) =>
      Promise.resolve({
        data: {
          sha: ref,
          html_url: `https://github.com/${owner}/${repo}/commit/${ref}`,
          commit: {
            message: `Commit message for ${ref}`,
            author: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
            committer: { date: '2024-01-01T00:00:00Z', name: 'Test Author' },
          },
        },
      }),
    )

    mockGetToken.mockReturnValue('test-token')
    localStorageMock.setItem(GITHUB_TOKEN_KEY, 'test-token')

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(listBranchesMock).toHaveBeenCalledTimes(2)
  })

  it('should handle missing GitHub token', async () => {
    mockGetToken.mockReturnValue(null) // Explicitly return null
    const { result } = renderHook(() => useBranches({ owner: 'testuser', repo: 'test-repo' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.branches).toEqual([])
    expect(listBranchesMock).not.toHaveBeenCalled()
  })

  it('surfaces an error when no GitHub token is available', async () => {
    mockSuccessfulBranchFetch()

    const { result } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(
      'GitHub token not found. Please authenticate first.',
    )
    expect(listBranchesMock).not.toHaveBeenCalled()
  })

  it('propagates branch selections through the store to other consumers', async () => {
    setToken()
    mockSuccessfulBranchFetch()

    const { result: branchesHook } = renderHook(() =>
      useBranches({ owner, repo, repositoryId, defaultBranch }),
    )

    const { result: consumerHook } = renderHook(() =>
      useAppStore((state) => state.getSelectedBranchForRepository(repositoryId) ?? null),
    )

    await waitFor(() => {
      expect(branchesHook.current.loading).toBe(false)
    })

    expect(consumerHook.current).toBe('main')

    act(() => {
      branchesHook.current.setSelectedBranch('develop')
    })

    await waitFor(() => {
      expect(consumerHook.current).toBe('develop')
    })
  })
})
