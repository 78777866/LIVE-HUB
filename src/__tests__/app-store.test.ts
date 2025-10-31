import { resetAppStore, useAppStore } from '../state/app-store'

describe('app store scaffolding', () => {
  beforeEach(() => {
    resetAppStore()
  })

  it('allows selecting a repository', () => {
    // First add some repositories to test with
    const testRepositories = [
      {
        id: '1',
        name: 'test-repo-1',
        owner: 'testuser',
        description: 'Test repository 1',
        defaultBranch: 'main',
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'test-repo-2',
        owner: 'testuser',
        description: 'Test repository 2',
        defaultBranch: 'main',
        updatedAt: new Date().toISOString(),
      },
    ]
    
    const { setRepositories, selectRepository } = useAppStore.getState()
    setRepositories(testRepositories)
    
    const repositories = useAppStore.getState().repositories
    expect(repositories).toHaveLength(2)

    const target = repositories[1]
    selectRepository(target.id)

    expect(useAppStore.getState().selectedRepositoryId).toEqual(target.id)
  })

  it('toggles directory expansion in the file tree', () => {
    const initialNode = useAppStore.getState().fileTree[0]
    expect(initialNode.isExpanded).toBe(true)

    useAppStore.getState().toggleFileNode(initialNode.path)
    expect(useAppStore.getState().fileTree[0].isExpanded).toBe(false)

    useAppStore.getState().toggleFileNode(initialNode.path)
    expect(useAppStore.getState().fileTree[0].isExpanded).toBe(true)
  })

  it('appends console lines with generated identifiers', () => {
    const { pushConsoleLine } = useAppStore.getState()
    const before = useAppStore.getState().consoleLines.length

    pushConsoleLine({ level: 'info', text: 'Synthetic log entry' })

    const afterState = useAppStore.getState()
    expect(afterState.consoleLines).toHaveLength(before + 1)
    const newEntry = afterState.consoleLines.at(-1)
    expect(newEntry?.id).toBeDefined()
    expect(newEntry?.text).toEqual('Synthetic log entry')
  })

  it('tracks branch selections per repository', () => {
    const { setRepositories, setSelectedBranchForRepository, getSelectedBranchForRepository, clearSelectedBranchForRepository } =
      useAppStore.getState()

    const repositories = [
      {
        id: 'repo-1',
        name: 'alpha',
        owner: 'octo',
        description: 'Alpha repository',
        defaultBranch: 'main',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'repo-2',
        name: 'beta',
        owner: 'octo',
        description: 'Beta repository',
        defaultBranch: 'develop',
        updatedAt: new Date().toISOString(),
      },
    ]

    setRepositories(repositories)
    setSelectedBranchForRepository('repo-1', 'main')
    setSelectedBranchForRepository('repo-2', 'develop')

    expect(getSelectedBranchForRepository('repo-1')).toBe('main')
    expect(getSelectedBranchForRepository('repo-2')).toBe('develop')

    clearSelectedBranchForRepository('repo-1')
    expect(getSelectedBranchForRepository('repo-1')).toBeUndefined()

    // Ensure selections are pruned when repositories change
    setRepositories([repositories[1]])
    expect(getSelectedBranchForRepository('repo-1')).toBeUndefined()
    expect(getSelectedBranchForRepository('repo-2')).toBe('develop')
  })
})
