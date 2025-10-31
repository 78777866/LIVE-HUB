import type { FileSystemTree } from '@webcontainer/api'
import type { FileNode, PackageManager, WorkspaceFramework } from '@/state/app-store'

export type DevCommandSpec = {
  framework: WorkspaceFramework
  scriptName: string
  command: string
  args: string[]
  display: string
  port: number
}

export type PackageJson = {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

type PromptFn = (message: string, defaultValue?: string) => string | null

export function detectPackageManager(tree: FileSystemTree): PackageManager {
  if (hasFile(tree, 'pnpm-lock.yaml') || hasFile(tree, 'pnpm-lock.yml')) {
    return 'pnpm'
  }

  if (hasFile(tree, 'yarn.lock')) {
    return 'yarn'
  }

  return 'npm'
}

export function parsePackageJson(tree: FileSystemTree): PackageJson | undefined {
  const contents = readFileFromTree(tree, 'package.json')

  if (!contents) {
    return undefined
  }

  try {
    return JSON.parse(contents) as PackageJson
  } catch (error) {
    console.error('Failed to parse package.json', error)
    return undefined
  }
}

export function inferDevCommand(
  pkg: PackageJson | undefined,
  packageManager: PackageManager,
  options?: { promptFn?: PromptFn },
): DevCommandSpec | null {
  if (!pkg) {
    return null
  }

  const scripts = pkg.scripts ?? {}
  const dependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  }

  const normalisedScripts = Object.fromEntries(
    Object.entries(scripts).map(([key, value]) => [key, value.toLowerCase()]),
  )

  const hasScript = (name: string) => typeof scripts[name] === 'string'
  const scriptIncludes = (name: string, snippet: string) =>
    normalisedScripts[name]?.includes(snippet)

  let framework: WorkspaceFramework = 'unknown'
  let scriptName: string | undefined
  let port = 3000

  if (
    scriptIncludes('dev', 'next') ||
    'next' in dependencies ||
    scriptIncludes('dev', 'turbo dev')
  ) {
    framework = 'next'
    scriptName = 'dev'
    port = 3000
  } else if (scriptIncludes('dev', 'vite') || 'vite' in dependencies) {
    framework = 'vite'
    scriptName = 'dev'
    port = 5173
  } else if (scriptIncludes('start', 'react-scripts') || 'react-scripts' in dependencies) {
    framework = 'create-react-app'
    scriptName = 'start'
    port = 3000
  } else if (hasScript('dev')) {
    framework = 'custom'
    scriptName = 'dev'
    port = 3000
  } else if (hasScript('start')) {
    framework = 'custom'
    scriptName = 'start'
    port = 3000
  }

  if (!scriptName) {
    const availableScripts = Object.keys(scripts)
    const promptFn = options?.promptFn

    if (promptFn && availableScripts.length > 0) {
      const suggested = availableScripts.includes('dev')
        ? 'dev'
        : availableScripts[0]
      const response = promptFn(
        `No dev script detected. Enter the package.json script to run (available: ${availableScripts.join(
          ', ',
        )})`,
        suggested,
      )

      if (response && response.trim().length > 0) {
        scriptName = response.trim()
        framework = 'custom'
      }
    }
  }

  if (!scriptName) {
    return null
  }

  const command = buildCommand(packageManager, scriptName)

  return {
    framework,
    scriptName,
    command: command.command,
    args: command.args,
    display: command.display,
    port,
  }
}

export function buildFileTreeFromFs(tree: FileSystemTree): FileNode[] {
  return Object.entries(tree)
    .map(([name, node]) => toFileNode(name, node, ''))
    .sort(sortFileNodes)
}

function toFileNode(name: string, node: FileSystemTree[keyof FileSystemTree], parentPath: string): FileNode {
  const fullPath = parentPath ? `${parentPath}/${name}` : name

  if (isDirectoryNode(node)) {
    const children = Object.entries(node.directory)
      .map(([childName, childNode]) => toFileNode(childName, childNode, fullPath))
      .sort(sortFileNodes)

    return {
      name,
      path: fullPath,
      type: 'directory',
      isExpanded: parentPath.length === 0,
      children,
    }
  }

  return {
    name,
    path: fullPath,
    type: 'file',
  }
}

function sortFileNodes(a: FileNode, b: FileNode): number {
  if (a.type === b.type) {
    return a.name.localeCompare(b.name)
  }

  return a.type === 'directory' ? -1 : 1
}

function isDirectoryNode(node: DirectoryLike | FileLike | SymlinkLike): node is DirectoryLike {
  return 'directory' in node
}

function hasFile(tree: FileSystemTree, target: string): boolean {
  return readFileFromTree(tree, target) !== undefined
}

type DirectoryLike = { directory: FileSystemTree }
type FileLike = { file: { contents: string | Uint8Array } }
type SymlinkLike = { file: { symlink: string } }

export function readFileFromTree(tree: FileSystemTree, targetPath: string): string | undefined {
  const segments = targetPath.split('/').filter(Boolean)

  let current: FileSystemTree | undefined = tree

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const entry = current?.[segment] as DirectoryLike | FileLike | SymlinkLike | undefined

    if (!entry) {
      return undefined
    }

    const isLast = index === segments.length - 1

    if (isLast) {
      if ('file' in entry && 'contents' in entry.file) {
        const contents = entry.file.contents
        return typeof contents === 'string' ? contents : new TextDecoder().decode(contents)
      }

      return undefined
    }

    if ('directory' in entry) {
      current = entry.directory
    } else {
      return undefined
    }
  }

  return undefined
}

function buildCommand(packageManager: PackageManager, scriptName: string) {
  if (packageManager === 'npm') {
    return {
      command: 'npm',
      args: ['run', scriptName],
      display: `npm run ${scriptName}`,
    }
  }

  if (packageManager === 'yarn') {
    return {
      command: 'yarn',
      args: [scriptName],
      display: `yarn ${scriptName}`,
    }
  }

  return {
    command: 'pnpm',
    args: [scriptName],
    display: `pnpm ${scriptName}`,
  }
}
