import { render, screen, fireEvent, act } from '@testing-library/react'
import { RepositoryPanel } from '@/components/panels/RepositoryPanel'
import { useAppStore } from '@/state/app-store'

// Mock the hooks to avoid importing octokit
jest.mock('@/hooks/useRepoData', () => ({
  useRepoData: jest.fn(),
}))
jest.mock('@/hooks/useBranches', () => ({
  useBranches: jest.fn(),
}))
jest.mock('@/hooks/usePersistence', () => ({
  usePersistence: jest.fn(),
}))
jest.mock('@/lib/webcontainer-client', () => ({
  launchWorkspace: jest.fn(),
  cancelInstallation: jest.fn(),
  stopDevServer: jest.fn(),
}))

import { useRepoData } from '@/hooks/useRepoData'
import { useBranches } from '@/hooks/useBranches'
import { usePersistence } from '@/hooks/usePersistence'

const mockUseRepoData = useRepoData as jest.MockedFunction<typeof useRepoData>
const mockUseBranches = useBranches as jest.MockedFunction<typeof useBranches>
const mockUsePersistence = usePersistence as jest.MockedFunction<typeof usePersistence>

describe('RepositoryPanel Search Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset the store state
    useAppStore.setState({
      repositories: [
        {
          id: '1',
          name: 'react-app',
          owner: 'user1',
          description: 'A React application',
          defaultBranch: 'main',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'vue-project',
          owner: 'user2',
          description: 'A Vue.js project',
          defaultBranch: 'main',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: '3',
          name: 'node-server',
          owner: 'user1',
          description: 'A Node.js server',
          defaultBranch: 'main',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ],
      selectedRepositoryId: undefined,
      webContainer: {
        status: 'idle',
        installProgress: 0,
        logs: [],
      },
    })

    // Mock hook implementations
    mockUseRepoData.mockReturnValue({
      repositories: [],
      loading: false,
      error: null,
      pagination: { page: 1, perPage: 30, hasNextPage: false },
      hasMore: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      clearCache: jest.fn(),
    })

    mockUseBranches.mockReturnValue({
      branches: [],
      loading: false,
      error: null,
      selectedBranch: null,
      setSelectedBranch: jest.fn(),
      refetch: jest.fn(),
      clearCache: jest.fn(),
    })

    mockUsePersistence.mockReturnValue({
      saveLastBranch: jest.fn(),
      getLastBranch: jest.fn().mockReturnValue(null),
      saveLastRepository: jest.fn(),
      getLastRepository: jest.fn().mockReturnValue(null),
      clearLastSelections: jest.fn(),
    })
  })

  it('should display all repositories when search is empty', () => {
    render(<RepositoryPanel />)
    
    // Should show all repositories from the store
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.getByText('user2/vue-project')).toBeInTheDocument()
    expect(screen.getByText('user1/node-server')).toBeInTheDocument()
  })

  it('should filter repositories by name', () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'react'
    fireEvent.change(searchInput, { target: { value: 'react' } })
    
    // Should only show react-app
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.queryByText('user2/vue-project')).not.toBeInTheDocument()
    expect(screen.queryByText('user1/node-server')).not.toBeInTheDocument()
  })

  it('should filter repositories by owner', () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'user2'
    fireEvent.change(searchInput, { target: { value: 'user2' } })
    
    // Should only show user2's repo
    expect(screen.queryByText('user1/react-app')).not.toBeInTheDocument()
    expect(screen.getByText('user2/vue-project')).toBeInTheDocument()
    expect(screen.queryByText('user1/node-server')).not.toBeInTheDocument()
  })

  it('should filter repositories by owner/name combination', () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'user1/react'
    fireEvent.change(searchInput, { target: { value: 'user1/react' } })
    
    // Should only show react-app
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.queryByText('user2/vue-project')).not.toBeInTheDocument()
    expect(screen.queryByText('user1/node-server')).not.toBeInTheDocument()
  })

  it('should show empty state when no repositories match search', () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    expect(screen.getByText('No repositories found matching your search')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search terms.')).toBeInTheDocument()
  })

  it('should clear search when clear button is clicked', () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'react'
    fireEvent.change(searchInput, { target: { value: 'react' } })
    
    // Should only show react-app
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.queryByText('user2/vue-project')).not.toBeInTheDocument()
    
    // Click clear button (X button in search input)
    const clearButton = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearButton)
    
    // Should show all repositories again
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.getByText('user2/vue-project')).toBeInTheDocument()
    expect(screen.getByText('user1/node-server')).toBeInTheDocument()
  })

  it('should not mutate the global store when filtering', () => {
    const initialStoreState = useAppStore.getState()
    const initialRepositories = [...initialStoreState.repositories]
    
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'react'
    fireEvent.change(searchInput, { target: { value: 'react' } })
    
    // Store should remain unchanged
    const currentStoreState = useAppStore.getState()
    expect(currentStoreState.repositories).toEqual(initialRepositories)
    expect(currentStoreState.repositories).toHaveLength(3)
  })

  it('should preserve search when new repositories are loaded', async () => {
    render(<RepositoryPanel />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    // Search for 'react'
    fireEvent.change(searchInput, { target: { value: 'react' } })
    
    // Should only show react-app
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.queryByText('user2/vue-project')).not.toBeInTheDocument()
    
    // Simulate new repositories being added to the store
    act(() => {
      useAppStore.setState({
        repositories: [
          ...useAppStore.getState().repositories,
          {
            id: '4',
            name: 'react-native-app',
            owner: 'user3',
            description: 'A React Native app',
            defaultBranch: 'main',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
      })
    })
    
    // Should now show both react repositories
    expect(screen.getByText('user1/react-app')).toBeInTheDocument()
    expect(screen.getByText('user3/react-native-app')).toBeInTheDocument()
    expect(screen.queryByText('user2/vue-project')).not.toBeInTheDocument()
  })
})