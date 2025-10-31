import { create } from 'zustand'
import type { WorkspaceTemplateId } from '../lib/workspace-templates'

export type SessionStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error'

export type SessionState = {
  status: SessionStatus
  loading: boolean
  error?: string
  user?: {
    name: string
    handle: string
    avatarUrl?: string
  }
  message?: string
  deviceCode?: string
  verificationUri?: string
}

export type RepositorySummary = {
  id: string
  name: string
  owner: string
  description?: string
  defaultBranch: string
  updatedAt: string
  workspaceTemplateId?: WorkspaceTemplateId
  selectedBranch?: string
}

export type PaginationState = {
  page: number
  perPage: number
  totalCount?: number
  hasNextPage: boolean
}

export type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  isExpanded?: boolean
  isLoading?: boolean
  children?: FileNode[]
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

export type WorkspaceFramework = 'next' | 'vite' | 'create-react-app' | 'custom' | 'unknown'

export type WebContainerLifecycle =
  | 'idle'
  | 'initializing'
  | 'installing-dependencies'
  | 'starting-dev-server'
  | 'ready'
  | 'error'

export type WebContainerState = {
  status: WebContainerLifecycle
  installProgress: number
  lastMessage?: string
  installPhase?: string
  packageManager?: PackageManager
  framework?: WorkspaceFramework
  devCommandLabel?: string
  previewPort?: number
  previewUrl?: string
  error?: string
  logs: ConsoleLine[]
}

export type ConsoleLine = {
  id: string
  text: string
  level: 'info' | 'warn' | 'error'
  timestamp: string
}

export type OpenFile = {
  path: string
  name: string
  content: string
  language: string
  isDirty?: boolean
}

type AppState = {
  session: SessionState
  repositories: RepositorySummary[]
  selectedRepositoryId?: string
  selectedBranch?: string
  fileTree: FileNode[]
  webContainer: WebContainerState
  consoleLines: ConsoleLine[]
  repositoryPagination: PaginationState
  openFiles: OpenFile[]
  activeFilePath?: string
  setSession: (session: Partial<SessionState>) => void
  setRepositories: (repositories: RepositorySummary[]) => void
  appendRepositories: (repositories: RepositorySummary[]) => void
  setRepositoryPagination: (pagination: Partial<PaginationState>) => void
  selectRepository: (repositoryId: string) => void
  selectBranch: (branch: string) => void
  setFileTree: (tree: FileNode[]) => void
  toggleFileNode: (path: string) => void
  setWebContainerState: (state: Partial<WebContainerState>) => void
  pushConsoleLine: (line: Omit<ConsoleLine, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void
  resetConsole: () => void
  openFile: (path: string, name: string, content: string, language: string) => void
  closeFile: (path: string) => void
  setActiveFile: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  createFile: (path: string, name: string) => void
  deleteFile: (path: string) => void
  renameFile: (path: string, newName: string) => void
}

const baseSession: SessionState = {
  status: 'unauthenticated',
  loading: false,
  error: undefined,
  message: 'Connect your GitHub account to start exploring repositories.',
}

const initialRepositories: RepositorySummary[] = []

const initialRepositoryPagination: PaginationState = {
  page: 1,
  perPage: 30,
  hasNextPage: true,
}

const initialFileTree: FileNode[] = [
  {
    name: 'app',
    path: 'app',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        name: 'layout.tsx',
        path: 'app/layout.tsx',
        type: 'file',
      },
      {
        name: 'page.tsx',
        path: 'app/page.tsx',
        type: 'file',
      },
      {
        name: 'globals.css',
        path: 'app/globals.css',
        type: 'file',
      },
    ],
  },
  {
    name: 'components',
    path: 'components',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        name: 'panels',
        path: 'components/panels',
        type: 'directory',
        isExpanded: true,
        children: [
          {
            name: 'EditorPanel.tsx',
            path: 'components/panels/EditorPanel.tsx',
            type: 'file',
          },
          {
            name: 'PreviewPanel.tsx',
            path: 'components/panels/PreviewPanel.tsx',
            type: 'file',
          },
          {
            name: 'ConsolePanel.tsx',
            path: 'components/panels/ConsolePanel.tsx',
            type: 'file',
          },
        ],
      },
    ],
  },
  {
    name: 'state',
    path: 'state',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        name: 'app-store.ts',
        path: 'state/app-store.ts',
        type: 'file',
      },
    ],
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
  },
]

const initialConsole: ConsoleLine[] = []

const defaultRepositories = createInitialRepositories()
const defaultRepositoryPagination = createInitialRepositoryPagination()
const defaultFileTree = createInitialFileTree()
const defaultConsole = createInitialConsole()

export const useAppStore = create<AppState>()((set, get) => ({
  session: createInitialSession(),
  repositories: defaultRepositories,
  selectedRepositoryId: undefined,
  selectedBranch: undefined,
  fileTree: defaultFileTree,
  webContainer: {
    status: 'idle',
    installProgress: 0,
    installPhase: undefined,
    packageManager: undefined,
    framework: 'unknown',
    devCommandLabel: undefined,
    previewPort: undefined,
    previewUrl: undefined,
    lastMessage: 'Awaiting workspace launch.',
    error: undefined,
    logs: defaultConsole,
  },
  consoleLines: defaultConsole,
  repositoryPagination: defaultRepositoryPagination,
  openFiles: [],
  activeFilePath: undefined,
  setSession: (session) =>
    set((state) => ({
      session: {
        ...state.session,
        ...session,
      },
    })),
  setRepositories: (repositories) =>
    set((state) => ({
      repositories,
      // Only change selected repository if none is currently selected
      selectedRepositoryId: state.selectedRepositoryId || repositories[0]?.id,
    })),
  appendRepositories: (newRepositories) =>
    set((state) => {
      // Create a map of existing repositories for O(1) lookup
      const existingRepoMap = new Map(state.repositories.map(repo => [repo.id, repo]))
      
      // Filter out duplicates and append the rest
      const uniqueNewRepos = newRepositories.filter(repo => !existingRepoMap.has(repo.id))
      
      return {
        repositories: [...state.repositories, ...uniqueNewRepos],
        // Only change selected repository if none is currently selected and we have new repos
        selectedRepositoryId: state.selectedRepositoryId || state.repositories[0]?.id || uniqueNewRepos[0]?.id,
      }
    }),
  setRepositoryPagination: (pagination) =>
    set((state) => ({
      repositoryPagination: {
        ...state.repositoryPagination,
        ...pagination,
      },
    })),
  selectRepository: (repositoryId) =>
    set((state) => ({
      selectedRepositoryId: repositoryId,
      // Clear selected branch when repository changes
      selectedBranch: undefined,
    })),
  selectBranch: (branch) =>
    set({
      selectedBranch: branch,
    }),
  setFileTree: (tree) => set({ fileTree: tree }),
  toggleFileNode: (path) =>
    set(({ fileTree }) => ({
      fileTree: toggleNodeExpansion(fileTree, path),
    })),
  setWebContainerState: (state) =>
    set((current) => ({
      webContainer: {
        ...current.webContainer,
        ...state,
        logs: state.logs ? [...state.logs] : current.webContainer.logs,
      },
    })),
  pushConsoleLine: ({ id, timestamp, ...rest }) =>
    set(({ consoleLines, webContainer }) => {
      const line: ConsoleLine = {
        id: id ?? generateId(),
        timestamp: timestamp ?? new Date().toISOString(),
        ...rest,
      }

      return {
        consoleLines: [...consoleLines, line],
        webContainer: {
          ...webContainer,
          logs: [...webContainer.logs, line],
        },
      }
    }),
  resetConsole: () =>
    set(({ webContainer }) => ({
      consoleLines: [],
      webContainer: {
        ...webContainer,
        logs: [],
      },
    })),
  openFile: (path, name, content, language) =>
    set((state) => {
      const existingFile = state.openFiles.find((f) => f.path === path)
      if (existingFile) {
        return {
          activeFilePath: path,
        }
      }

      const newFile: OpenFile = {
        path,
        name,
        content,
        language,
        isDirty: false,
      }

      return {
        openFiles: [...state.openFiles, newFile],
        activeFilePath: path,
      }
    }),
  closeFile: (path) =>
    set((state) => {
      const newOpenFiles = state.openFiles.filter((f) => f.path !== path)
      const newActiveFilePath =
        state.activeFilePath === path
          ? newOpenFiles.length > 0
            ? newOpenFiles[newOpenFiles.length - 1].path
            : undefined
          : state.activeFilePath

      return {
        openFiles: newOpenFiles,
        activeFilePath: newActiveFilePath,
      }
    }),
  setActiveFile: (path) =>
    set({
      activeFilePath: path,
    }),
  updateFileContent: (path, content) =>
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      ),
    })),
  createFile: (path, name) =>
    set((state) => {
      const newFile: OpenFile = {
        path,
        name,
        content: '',
        language: getLanguageFromExtension(name),
        isDirty: true,
      }

      const addFileToTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.path === path.substring(0, path.lastIndexOf('/'))) {
            return {
              ...node,
              children: [...(node.children || []), {
                name,
                path,
                type: 'file',
              }],
            }
          }
          if (node.children) {
            return {
              ...node,
              children: addFileToTree(node.children),
            }
          }
          return node
        })
      }

      return {
        openFiles: [...state.openFiles, newFile],
        activeFilePath: path,
        fileTree: addFileToTree(state.fileTree),
      }
    }),
  deleteFile: (path) =>
    set((state) => {
      const removeFileFromTree = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .filter((node) => node.path !== path)
          .map((node) => ({
            ...node,
            children: node.children ? removeFileFromTree(node.children) : undefined,
          }))
      }

      const newOpenFiles = state.openFiles.filter((f) => f.path !== path)
      const newActiveFilePath =
        state.activeFilePath === path
          ? newOpenFiles.length > 0
            ? newOpenFiles[newOpenFiles.length - 1].path
            : undefined
          : state.activeFilePath

      return {
        openFiles: newOpenFiles,
        activeFilePath: newActiveFilePath,
        fileTree: removeFileFromTree(state.fileTree),
      }
    }),
  renameFile: (path, newName) =>
    set((state) => {
      const newPath = path.substring(0, path.lastIndexOf('/') + 1) + newName

      const renameFileInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.path === path) {
            return {
              ...node,
              name: newName,
              path: newPath,
            }
          }
          if (node.children) {
            return {
              ...node,
              children: renameFileInTree(node.children),
            }
          }
          return node
        })
      }

      return {
        openFiles: state.openFiles.map((f) =>
          f.path === path
            ? { ...f, name: newName, path: newPath, isDirty: true }
            : f
        ),
        activeFilePath: state.activeFilePath === path ? newPath : state.activeFilePath,
        fileTree: renameFileInTree(state.fileTree),
      }
    }),
}))

export function resetAppStore() {
  const repositories = createInitialRepositories()
  const repositoryPagination = createInitialRepositoryPagination()
  const fileTree = createInitialFileTree()
  const consoleLines = createInitialConsole()

  useAppStore.setState({
    session: createInitialSession(),
    repositories,
    selectedRepositoryId: undefined,
    selectedBranch: undefined,
    fileTree,
    webContainer: {
      status: 'idle',
      installProgress: 0,
      installPhase: undefined,
      packageManager: undefined,
      framework: 'unknown',
      devCommandLabel: undefined,
      previewPort: undefined,
      previewUrl: undefined,
      lastMessage: 'Awaiting workspace launch.',
      error: undefined,
      logs: consoleLines,
    },
    consoleLines,
    repositoryPagination,
    openFiles: [],
    activeFilePath: undefined,
  })
}

function toggleNodeExpansion(nodes: FileNode[], targetPath: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return {
        ...node,
        isExpanded: !node.isExpanded,
      }
    }

    if (node.children) {
      return {
        ...node,
        children: toggleNodeExpansion(node.children, targetPath),
      }
    }

    return node
  })
}

function createInitialSession(): SessionState {
  return { ...baseSession }
}

function createInitialRepositories(): RepositorySummary[] {
  return initialRepositories.map((repository) => ({ ...repository }))
}

function createInitialRepositoryPagination(): PaginationState {
  return { ...initialRepositoryPagination }
}

function createInitialConsole(): ConsoleLine[] {
  return initialConsole.map((line) => ({ ...line }))
}

function createInitialFileTree(): FileNode[] {
  return cloneFileNodes(initialFileTree)
}

function cloneFileNodes(nodes: FileNode[]): FileNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneFileNodes(node.children) : undefined,
  }))
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `line-${Math.random().toString(36).slice(2, 10)}`
}

function getLanguageFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'ts':
      return 'typescript'
    case 'tsx':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'html':
      return 'html'
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'scss':
      return 'scss'
    case 'sass':
      return 'sass'
    case 'less':
      return 'less'
    case 'md':
      return 'markdown'
    case 'xml':
      return 'xml'
    case 'yaml':
    case 'yml':
      return 'yaml'
    case 'sql':
      return 'sql'
    case 'py':
      return 'python'
    case 'java':
      return 'java'
    case 'c':
    case 'h':
      return 'c'
    case 'cpp':
    case 'cxx':
    case 'cc':
    case 'hpp':
      return 'cpp'
    case 'cs':
      return 'csharp'
    case 'php':
      return 'php'
    case 'rb':
      return 'ruby'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'swift':
      return 'swift'
    case 'kt':
      return 'kotlin'
    case 'dart':
      return 'dart'
    case 'vue':
      return 'html'
    case 'svelte':
      return 'html'
    default:
      return 'plaintext'
  }
}
