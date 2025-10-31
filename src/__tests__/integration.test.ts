import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { useAppStore } from '@/state/app-store'
import { launchWorkspace } from '@/lib/webcontainer-client'

// Mock WebContainer API
jest.mock('@webcontainer/api', () => ({
  __esModule: true,
  WebContainer: {
    boot: jest.fn().mockResolvedValue({
      mount: jest.fn().mockResolvedValue(undefined),
      spawn: jest.fn().mockImplementation((command, args) => ({
        output: new ReadableStream({
          start(controller) {
            controller.enqueue('Installation output\n')
            controller.close()
          }
        }),
        exit: Promise.resolve(0),
        kill: jest.fn().mockResolvedValue(undefined)
      })),
      on: jest.fn(),
      teardown: jest.fn().mockResolvedValue(undefined)
    })
  }
}))

// Mock JSZip
jest.mock('jszip', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    loadAsync: jest.fn().mockResolvedValue({
      files: {
        'test-repo-main/package.json': {
          dir: false,
          async: jest.fn().mockResolvedValue('{"name": "test-repo", "scripts": {"dev": "next dev"}}')
        },
        'test-repo-main/README.md': {
          dir: false,
          async: jest.fn().mockResolvedValue('# Test Repository')
        }
      }
    })
  }))
}))

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        downloadArchive: jest.fn().mockResolvedValue({
          data: new ArrayBuffer(8)
        })
      }
    }
  }))
}))

// Mock token utility
jest.mock('@/lib/token', () => ({
  getGitHubToken: jest.fn().mockReturnValue('mock-token')
}))

// Mock workspace templates
jest.mock('@/lib/workspace-templates', () => ({
  getWorkspaceTemplateById: jest.fn().mockReturnValue({
    id: 'nextjs-starter',
    defaultPort: 3000,
    files: {
      'package.json': {
        file: {
          contents: '{"name": "template", "scripts": {"dev": "next dev"}}'
        }
      }
    }
  })
}))

// Mock environment
Object.defineProperty(window, 'prompt', {
  writable: true,
  value: jest.fn().mockReturnValue('dev')
})

describe('Integration Test: WebContainer Repository Sync', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.setState({
      repositories: [],
      selectedRepositoryId: undefined,
      webContainer: {
        status: 'idle',
        installProgress: 0,
        packageManager: undefined,
        framework: 'unknown',
        devCommandLabel: undefined,
        previewPort: undefined,
        previewUrl: undefined,
        lastMessage: 'Awaiting workspace launch.',
        error: undefined,
        logs: []
      },
      consoleLines: []
    })
    
    jest.clearAllMocks()
  })

  it('should successfully authenticate, select repo/branch, launch workspace, and reach ready state', async () => {
    const { result } = renderHook(() => useAppStore())

    // Step 1: Authenticate user
    act(() => {
      result.current.setSession({
        status: 'authenticated',
        user: {
          name: 'Test User',
          handle: 'testuser',
          avatarUrl: 'https://example.com/avatar.jpg'
        },
        message: 'Session established. Workspace is ready for repository actions.'
      })
    })

    expect(result.current.session.status).toBe('authenticated')
    expect(result.current.session.user?.handle).toBe('testuser')

    // Step 2: Set up repositories
    const mockRepository = {
      id: '123',
      name: 'test-repo',
      owner: 'testowner',
      description: 'Test repository',
      defaultBranch: 'main',
      updatedAt: '2024-01-01T00:00:00Z',
      selectedBranch: 'main'
    }

    act(() => {
      result.current.setRepositories([mockRepository])
      result.current.selectRepository('123')
    })

    expect(result.current.repositories).toHaveLength(1)
    expect(result.current.selectedRepositoryId).toBe('123')

    // Step 3: Launch workspace (this should trigger repository sync)
    await act(async () => {
      await launchWorkspace(mockRepository)
    })

    // Verify state transitions
    await waitFor(() => {
      const state = result.current.webContainer
      expect(state.status).toBe('ready')
      expect(state.lastMessage).toContain('Development server ready')
      expect(state.previewUrl).toBeDefined()
      expect(state.installProgress).toBe(100)
    })

    // Verify console logs were captured
    const logs = result.current.consoleLines
    expect(logs.some(log => log.text.includes('Launching workspace'))).toBe(true)
    expect(logs.some(log => log.text.includes('Repository files synced successfully'))).toBe(true)
    expect(logs.some(log => log.text.includes('Development server is ready'))).toBe(true)

    // Verify file tree was populated
    expect(result.current.fileTree.length).toBeGreaterThan(0)
  })

  it('should fallback to template when repository sync fails', async () => {
    const { result } = renderHook(() => useAppStore())

    // Mock syncRepository to throw an error
    const { syncRepository } = await import('@/lib/github-sync')
    jest.mocked(syncRepository).mockRejectedValue(new Error('Repository not found'))

    // Set up authenticated state and repository
    act(() => {
      result.current.setSession({
        status: 'authenticated',
        user: {
          name: 'Test User',
          handle: 'testuser'
        }
      })

      const mockRepository: any = {
        id: '456',
        name: 'nonexistent-repo',
        owner: 'testowner',
        description: 'Non-existent repository',
        defaultBranch: 'main',
        updatedAt: '2024-01-01T00:00:00Z',
        workspaceTemplateId: 'nextjs-starter'
      }

      result.current.setRepositories([mockRepository])
      result.current.selectRepository('456')
    })

    // Launch workspace (should fallback to template)
    await act(async () => {
      await launchWorkspace(result.current.repositories[0])
    })

    // Verify fallback behavior
    await waitFor(() => {
      const state = result.current.webContainer
      expect(state.status).toBe('ready')
    })

    // Verify fallback was logged
    const logs = result.current.consoleLines
    expect(logs.some(log => log.text.includes('Repository sync failed'))).toBe(true)
    expect(logs.some(log => log.text.includes('Falling back to workspace template'))).toBe(true)
    expect(logs.some(log => log.level === 'warn')).toBe(true)
  })

  it('should handle branch selection correctly', async () => {
    const { result } = renderHook(() => useAppStore())

    // Set up repository with multiple branches
    const mockRepository = {
      id: '101',
      name: 'multi-branch-repo',
      owner: 'testowner',
      description: 'Repository with multiple branches',
      defaultBranch: 'main',
      updatedAt: '2024-01-01T00:00:00Z',
      selectedBranch: 'main'
    }

    act(() => {
      result.current.setRepositories([mockRepository])
      result.current.selectRepository('101')
    })

    // Change branch
    act(() => {
      result.current.setSelectedBranch('101', 'develop')
    })

    // Verify branch was updated
    expect(result.current.repositories[0].selectedBranch).toBe('develop')

    // Verify syncRepository would be called with correct branch
    const { syncRepository } = await import('@/lib/github-sync')
    await act(async () => {
      await launchWorkspace(result.current.repositories[0])
    })

    expect(jest.mocked(syncRepository)).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'testowner',
        repo: 'multi-branch-repo',
        branch: 'develop'
      })
    )
  })
})