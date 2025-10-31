// @ts-nocheck
import { renderHook, act, waitFor } from '@testing-library/react'
import { Octokit } from '@octokit/rest'
import { useGitHubAuth } from '@/hooks/useGitHubAuth'
import { resetAppStore } from '@/state/app-store'
import { pollForToken } from '@/lib/github-oauth-proxy'

// Mock the token module
jest.mock('@/lib/token', () => ({
  getGitHubToken: jest.fn(),
  setGitHubToken: jest.fn(),
  removeGitHubToken: jest.fn(),
  hasGitHubToken: jest.fn(),
}))

import { getGitHubToken, setGitHubToken, removeGitHubToken } from '@/lib/token'
const mockGetGitHubToken = getGitHubToken as jest.MockedFunction<typeof getGitHubToken>
const mockSetGitHubToken = setGitHubToken as jest.MockedFunction<typeof setGitHubToken>
const mockRemoveGitHubToken = removeGitHubToken as jest.MockedFunction<typeof removeGitHubToken>

// Mock Octokit and GitHub OAuth proxy
jest.mock('@/lib/github-oauth-proxy', () => ({
  pollForToken: jest.fn(),
}))

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}))

const mockedPollForToken = pollForToken as jest.MockedFunction<typeof pollForToken>
const MockedOctokit = Octokit as unknown as jest.MockedClass<typeof Octokit>

const originalEnv = process.env

describe('useGitHubAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetAppStore()
    process.env = { ...originalEnv, NEXT_PUBLIC_GITHUB_CLIENT_ID: undefined }
    mockGetGitHubToken.mockReturnValue(null)
    localStorage.clear()
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useGitHubAuth())

    expect(result.current.session.status).toBe('unauthenticated')
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeUndefined()
    expect(result.current.code).toBeUndefined()
  })

  it('sets error when GitHub client ID is missing', async () => {
    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('GitHub client ID not configured')
    expect(result.current.loading).toBe(false)
  })

  it('initiates device flow and authenticates successfully', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    let verificationCallback: any

    mockedPollForToken.mockImplementation(async (clientId, scopes, onVerification) => {
      if (onVerification) {
        verificationCallback = onVerification
        onVerification({
          user_code: 'ZXCV-0987',
          verification_uri: 'https://github.com/login/device',
        })
      }
      return 'mock_token'
    })

    const mockOctokit = {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({
          data: {
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://github.com/avatar.jpg',
          },
        }),
      },
    }
    MockedOctokit.mockImplementation(() => mockOctokit as any)

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(result.current.code).toBeUndefined()
    expect(result.current.loading).toBe(false)
  })

  it('handles device flow errors gracefully', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockRejectedValue(new Error('Device flow failed'))

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('Device flow failed')
    expect(result.current.loading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('handles token validation errors', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockResolvedValue('mock_token')

    const mockOctokit = {
      users: {
        getAuthenticated: jest.fn().mockRejectedValue(new Error('Bad credentials')),
      },
    }
    MockedOctokit.mockImplementation(() => mockOctokit as any)

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('Invalid token. Please sign in again.')
    expect(result.current.loading).toBe(false)
    expect(mockRemoveGitHubToken).toHaveBeenCalled()
  })

  it('signs out and resets the session state', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockResolvedValue('mock_token')

    const mockOctokit = {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({
          data: {
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://github.com/avatar.jpg',
          },
        }),
      },
    }
    MockedOctokit.mockImplementation(() => mockOctokit as any)

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.signOut()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.session.status).toBe('unauthenticated')
    expect(result.current.loading).toBe(false)
    expect(result.current.session.user).toBeUndefined()
    expect(mockRemoveGitHubToken).toHaveBeenCalled()
  })

  it('validates an existing token on mount when client ID is configured', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'
    mockGetGitHubToken.mockReturnValue('existing_token')

    const mockOctokit = {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({
          data: {
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://github.com/avatar.jpg',
          },
        }),
      },
    }
    MockedOctokit.mockImplementation(() => mockOctokit as any)

    const { result } = renderHook(() => useGitHubAuth())

    await waitFor(() => expect(mockGetGitHubToken).toHaveBeenCalled())
    await waitFor(() => expect(MockedOctokit).toHaveBeenCalledWith({ auth: 'existing_token' }))
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.loading).toBe(false)
  })

  it('skips token validation when client ID is not configured', () => {
    renderHook(() => useGitHubAuth())

    expect(mockGetGitHubToken).not.toHaveBeenCalled()
    expect(MockedOctokit).not.toHaveBeenCalled()
  })

  it('handles CORS errors with user-friendly messages', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockRejectedValue(new Error('Access to fetch at \'https://github.com/login/device/code\' from origin \'http://localhost:3000\' has been blocked by CORS policy'))

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('Network error: Unable to connect to GitHub. Please check your internet connection and try again.')
    expect(result.current.loading).toBe(false)
  })

  it('handles timeout errors with appropriate messages', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockRejectedValue(new Error('Authorization timed out. Please try again.'))

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('Authorization timed out. Please try again.')
    expect(result.current.loading).toBe(false)
  })

  it('handles authorization_pending errors with user-friendly messages', async () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test_client_id'

    mockedPollForToken.mockRejectedValue(new Error('authorization_pending'))

    const { result } = renderHook(() => useGitHubAuth())

    await act(async () => {
      await result.current.initiateDeviceFlow()
    })

    expect(result.current.session.status).toBe('error')
    expect(result.current.error).toBe('Authorization is pending. Please complete the authorization in your browser.')
    expect(result.current.loading).toBe(false)
  })
})
