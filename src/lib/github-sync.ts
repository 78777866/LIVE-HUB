import type { FileSystemTree } from '@webcontainer/api'
import { Octokit } from '@octokit/rest'
import JSZip from 'jszip'
import { getGitHubToken } from '@/lib/token'

export interface RepositorySyncOptions {
  owner: string
  repo: string
  branch?: string
  onProgress?: (message: string) => void
}

export interface RepositorySyncResult {
  files: FileSystemTree
  packageManager: 'npm' | 'pnpm' | 'yarn'
  hasPackageJson: boolean
}

/**
 * Downloads and extracts a GitHub repository archive into a WebContainer-compatible FileSystemTree
 */
export async function syncRepository(options: RepositorySyncOptions): Promise<RepositorySyncResult> {
  const { owner, repo, branch = 'main', onProgress } = options

  onProgress?.(`Fetching ${owner}/${repo} (${branch}) from GitHub…`)

  // Get GitHub token
  const token = getGitHubToken() || process.env.NEXT_PUBLIC_GITHUB_TOKEN
  if (!token) {
    throw new Error('GitHub token not found. Please authenticate first.')
  }

  const octokit = new Octokit({ auth: token })

  try {
    // Get the repository archive as a blob
    const response = await octokit.rest.repos.downloadArchive({
      owner,
      repo,
      ref: branch,
      archive_format: 'zip',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.data) {
      throw new Error('No archive data received from GitHub')
    }

    onProgress?.('Download complete. Extracting files…')

    // Convert the response data to a buffer for JSZip
    let zipData: ArrayBuffer
    if (response.data instanceof ArrayBuffer) {
      zipData = response.data
    } else if (response.data instanceof Uint8Array) {
      zipData = response.data.buffer || response.data
    } else {
      // Handle different response formats
      const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      zipData = new TextEncoder().encode(text).buffer
    }

    // Extract the zip file
    const zip = await JSZip.loadAsync(zipData)
    const files: FileSystemTree = {}

    // Find the root directory (usually {repo-name}-{branch}/)
    const zipFiles = Object.entries(zip.files)
    const rootDir = findRootDirectory(zipFiles)
    
    let hasPackageJson = false
    let packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm'

    // Process each file in the zip
    for (const [relativePath, zipEntry] of zipFiles) {
      // Skip directories and __MACOSX files
      if (zipEntry.dir || relativePath.includes('__MACOSX/')) {
        continue
      }

      // Remove the root directory prefix if present
      const cleanPath = rootDir ? relativePath.replace(`${rootDir}/`, '') : relativePath
      
      // Skip empty paths and the root directory itself
      if (!cleanPath || cleanPath === rootDir) {
        continue
      }

      // Check for package.json and lock files to determine package manager
      if (cleanPath === 'package.json') {
        hasPackageJson = true
      } else if (cleanPath === 'pnpm-lock.yaml' || cleanPath === 'pnpm-lock.yml') {
        packageManager = 'pnpm'
      } else if (cleanPath === 'yarn.lock') {
        packageManager = 'yarn'
      }

      // Convert the zip entry to WebContainer format
      const fileNode = await zipEntry.async('uint8array')
      setFileInTree(files, cleanPath, fileNode)
    }

    onProgress?.(`Extracted ${Object.keys(files).length} files`)

    return {
      files,
      packageManager,
      hasPackageJson,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to sync repository: ${error.message}`)
    }
    throw new Error('Failed to sync repository: Unknown error')
  }
}

/**
 * Finds the root directory in the zip archive
 */
function findRootDirectory(files: [string, JSZip.JSZipObject][]): string | null {
  // Look for directories that contain most files
  const dirCounts = new Map<string, number>()
  
  for (const [path] of files) {
    if (path.includes('/')) {
      const rootDir = path.split('/')[0]
      dirCounts.set(rootDir, (dirCounts.get(rootDir) || 0) + 1)
    }
  }
  
  // Find the directory with the most files
  let maxCount = 0
  let rootDir: string | null = null
  
  for (const [dir, count] of dirCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      rootDir = dir
    }
  }
  
  return rootDir
}

/**
 * Sets a file in the FileSystemTree at the given path
 */
function setFileInTree(tree: FileSystemTree, path: string, content: Uint8Array): void {
  const parts = path.split('/')
  let current = tree

  // Navigate to the parent directory
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    
    if (!current[part]) {
      current[part] = { directory: {} }
    } else if (!('directory' in current[part])) {
      // This shouldn't happen in a valid zip, but handle it gracefully
      current[part] = { directory: {} }
    }
    
    current = (current[part] as { directory: FileSystemTree }).directory
  }

  // Set the file
  const fileName = parts[parts.length - 1]
  current[fileName] = {
    file: { contents: content }
  }
}