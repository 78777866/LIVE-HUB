import { WebContainer } from '@webcontainer/api'
import type { FileNode } from '@/state/app-store'

export interface FileSystemAPI {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
  mkdir: (path: string) => Promise<void>
  readdir: (path: string) => Promise<{ name: string; path: string; type: 'file' | 'directory' }[]>
  getFileTree: (path?: string) => Promise<FileNode[]>
}

export function createFileSystemAPI(webcontainer: WebContainer | null): FileSystemAPI {
  if (!webcontainer) {
    // Return a mock implementation when WebContainer is not available
    return {
      readFile: async (path: string) => {
        throw new Error(`WebContainer not available. Cannot read file: ${path}`)
      },
      writeFile: async (path: string, content: string) => {
        throw new Error(`WebContainer not available. Cannot write file: ${path}`)
      },
      deleteFile: async (path: string) => {
        throw new Error(`WebContainer not available. Cannot delete file: ${path}`)
      },
      renameFile: async (oldPath: string, newPath: string) => {
        throw new Error(`WebContainer not available. Cannot rename file: ${oldPath}`)
      },
      exists: async (path: string) => {
        return false
      },
      mkdir: async (path: string) => {
        throw new Error(`WebContainer not available. Cannot create directory: ${path}`)
      },
      readdir: async (path: string) => {
        return []
      },
      getFileTree: async (path?: string) => {
        return []
      },
    }
  }

  return {
    async readFile(path: string): Promise<string> {
      try {
        const file = await webcontainer.fs.readFile(path, 'utf-8')
        return file as string
      } catch (error) {
        throw new Error(`Failed to read file ${path}: ${error}`)
      }
    },

    async writeFile(path: string, content: string): Promise<void> {
      try {
        // Ensure parent directory exists
        const parentDir = path.substring(0, path.lastIndexOf('/'))
        if (parentDir && !(await this.exists(parentDir))) {
          await this.mkdir(parentDir)
        }
        
        await webcontainer.fs.writeFile(path, content)
      } catch (error) {
        throw new Error(`Failed to write file ${path}: ${error}`)
      }
    },

    async deleteFile(path: string): Promise<void> {
      try {
        await webcontainer.fs.rm(path, { recursive: true })
      } catch (error) {
        throw new Error(`Failed to delete file ${path}: ${error}`)
      }
    },

    async renameFile(oldPath: string, newPath: string): Promise<void> {
      try {
        await webcontainer.fs.rename(oldPath, newPath)
      } catch (error) {
        throw new Error(`Failed to rename file ${oldPath} to ${newPath}: ${error}`)
      }
    },

    async exists(path: string): Promise<boolean> {
      try {
        await webcontainer.fs.readFile(path)
        return true
      } catch {
        try {
          const stat = await webcontainer.fs.stat(path)
          return stat.isDirectory() || stat.isFile()
        } catch {
          return false
        }
      }
    },

    async mkdir(path: string): Promise<void> {
      try {
        await webcontainer.fs.mkdir(path, { recursive: true })
      } catch (error) {
        throw new Error(`Failed to create directory ${path}: ${error}`)
      }
    },

    async readdir(path: string): Promise<{ name: string; path: string; type: 'file' | 'directory' }[]> {
      try {
        const entries = await webcontainer.fs.readdir(path)
        return entries.map((entry) => ({
          name: entry.name,
          path: path.endsWith('/') ? `${path}${entry.name}` : `${path}/${entry.name}`,
          type: entry.isDirectory() ? 'directory' : 'file',
        }))
      } catch (error) {
        throw new Error(`Failed to read directory ${path}: ${error}`)
      }
    },

    async getFileTree(path: string = '/'): Promise<FileNode[]> {
      try {
        const entries = await this.readdir(path)
        const nodes: FileNode[] = []

        for (const entry of entries) {
          const node: FileNode = {
            name: entry.name,
            path: entry.path,
            type: entry.type,
            isExpanded: false,
          }

          if (entry.type === 'directory') {
            try {
              node.children = await this.getFileTree(entry.path)
            } catch {
              // Skip directories we can't read
              continue
            }
          }

          nodes.push(node)
        }

        return nodes.sort((a, b) => {
          // Directories first, then files
          if (a.type === 'directory' && b.type === 'file') return -1
          if (a.type === 'file' && b.type === 'directory') return 1
          return a.name.localeCompare(b.name)
        })
      } catch (error) {
        throw new Error(`Failed to get file tree for ${path}: ${error}`)
      }
    },
  }
}

// Utility functions for file operations
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

export function getLanguageFromExtension(filename: string): string {
  const extension = getFileExtension(filename)
  
  switch (extension) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'html':
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

export function generateMockContent(filename: string): string {
  const extension = getFileExtension(filename)
  
  switch (extension) {
    case 'tsx':
    case 'jsx':
      return `import React from 'react'

export default function Component() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  )
}`
    
    case 'ts':
    case 'js':
      return `export function hello() {
  console.log('Hello, World!')
  return 'Hello, World!'
}`
    
    case 'json':
      return `{
  "name": "${filename.replace('.json', '')}",
  "version": "1.0.0",
  "description": "Generated file"
}`
    
    case 'css':
      return `.container {
  display: flex;
  align-items: center;
  justify-content: center;
}`
    
    case 'html':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`
    
    case 'md':
      return `# ${filename.replace('.md', '')}

This is a markdown file.

## Features

- Feature 1
- Feature 2
- Feature 3`
    
    default:
      return `// ${filename}
// Generated content
`
  }
}