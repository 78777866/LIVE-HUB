'use client'

import { useState, useRef, useEffect } from 'react'
import { PanelShell } from '@/components/panels/PanelShell'
import { useAppStore } from '@/state/app-store'
import type { FileNode } from '@/state/app-store'
import { cn } from '@/lib/utils'
import { generateMockContent, getLanguageFromExtension } from '@/lib/file-system'

export function FileTreePanel() {
  const fileTree = useAppStore((state) => state.fileTree)
  const toggleNode = useAppStore((state) => state.toggleFileNode)
  const openFile = useAppStore((state) => state.openFile)
  const createFile = useAppStore((state) => state.createFile)
  const deleteFile = useAppStore((state) => state.deleteFile)
  const renameFile = useAppStore((state) => state.renameFile)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    node: FileNode
  } | null>(null)
  const [renamingNode, setRenamingNode] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [creatingFile, setCreatingFile] = useState<string | null>(null)
  const [newFileNameInput, setNewFileNameInput] = useState('')
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      // Mock file content for demo
      const mockContent = generateMockContent(node.name)
      const language = getLanguageFromExtension(node.name)
      openFile(node.path, node.name, mockContent, language)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleCreateFile = (parentPath: string) => {
    if (newFileNameInput.trim()) {
      const filePath = parentPath ? `${parentPath}/${newFileNameInput.trim()}` : newFileNameInput.trim()
      createFile(filePath, newFileNameInput.trim())
      setNewFileNameInput('')
      setCreatingFile(null)
    }
  }

  const handleRename = (oldPath: string, newName: string) => {
    if (newName.trim() && newName !== oldPath.split('/').pop()) {
      renameFile(oldPath, newName.trim())
    }
    setRenamingNode(null)
    setNewFileName('')
  }

  const handleDelete = (path: string) => {
    if (confirm(`Delete ${path}?`)) {
      deleteFile(path)
    }
    setContextMenu(null)
  }

  return (
    <PanelShell
      title="File Tree"
      status={fileTree.length === 0 ? 'loading' : 'ready'}
      className="xl:flex-1"
      autoExpand={true}
    >
      <div className="h-full overflow-auto p-2 pb-3">
        <nav aria-label="Project file tree">
          <ul className="space-y-1 text-[10px] text-slate-300">
            {fileTree.map((node) => (
              <FileNodeItem
                key={node.path}
                depth={0}
                node={node}
                onToggle={toggleNode}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
                onRename={(path) => setRenamingNode(path)}
                onCreateFile={(path) => setCreatingFile(path)}
                renamingNode={renamingNode}
                newFileName={newFileName}
                onNewFileNameChange={setNewFileName}
                onRenameComplete={handleRename}
                creatingFile={creatingFile}
                newFileNameInput={newFileNameInput}
                onNewFileNameInputChange={setNewFileNameInput}
                onCreateFileComplete={handleCreateFile}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-slate-800 border border-slate-700 rounded shadow-lg py-1 z-50 text-[10px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node.type === 'directory' && (
            <button
              onClick={() => {
                setCreatingFile(contextMenu.node.path)
                setContextMenu(null)
              }}
              className="block w-full text-left px-2 py-1 text-slate-300 hover:bg-slate-700"
            >
              New File
            </button>
          )}
          <button
            onClick={() => {
              setRenamingNode(contextMenu.node.path)
              setNewFileName(contextMenu.node.name)
              setContextMenu(null)
            }}
            className="block w-full text-left px-2 py-1 text-slate-300 hover:bg-slate-700"
          >
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.node.path)}
            className="block w-full text-left px-2 py-1 text-red-400 hover:bg-slate-700"
          >
            Delete
          </button>
        </div>
      )}
    </PanelShell>
  )
}

type FileNodeItemProps = {
  node: FileNode
  depth: number
  onToggle: (path: string) => void
  onFileClick: (node: FileNode) => void
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  onRename: (path: string) => void
  onCreateFile: (path: string) => void
  renamingNode: string | null
  newFileName: string
  onNewFileNameChange: (name: string) => void
  onRenameComplete: (oldPath: string, newName: string) => void
  creatingFile: string | null
  newFileNameInput: string
  onNewFileNameInputChange: (name: string) => void
  onCreateFileComplete: (parentPath: string) => void
}

function FileNodeItem({
  node,
  depth,
  onToggle,
  onFileClick,
  onContextMenu,
  onRename,
  onCreateFile,
  renamingNode,
  newFileName,
  onNewFileNameChange,
  onRenameComplete,
  creatingFile,
  newFileNameInput,
  onNewFileNameInputChange,
  onCreateFileComplete,
}: FileNodeItemProps) {
  const isDirectory = node.type === 'directory'
  const padding = depth * 10
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if ((renamingNode === node.path || creatingFile === node.path) && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingNode, creatingFile, node.path])

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path)
    } else {
      onFileClick(node)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (renamingNode === node.path) {
        onRenameComplete(node.path, newFileName)
      } else if (creatingFile === node.path) {
        onCreateFileComplete(node.path)
      }
    } else if (e.key === 'Escape') {
      if (renamingNode === node.path) {
        onRename(node.path) // This will cancel the rename
      } else if (creatingFile === node.path) {
        onCreateFile(node.path) // This will cancel the create
      }
    }
  }

  return (
    <li>
      <div
        className={cn(
          'flex w-full items-center gap-1 rounded border border-transparent px-1.5 py-1 text-left transition-colors duration-default hover:border-slate-700 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default',
          node.isExpanded && isDirectory ? 'border-slate-700 bg-slate-900/60' : undefined,
        )}
        style={{ paddingLeft: padding + 6 }}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span className="text-[9px] text-slate-500">
          {isDirectory ? (node.isExpanded ? '▾' : '▸') : '•'}
        </span>
        
        {renamingNode === node.path ? (
          <input
            ref={inputRef}
            type="text"
            value={newFileName}
            onChange={(e) => onNewFileNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onRenameComplete(node.path, newFileName)}
            className="flex-1 bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-[10px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'flex-1 text-left',
              isDirectory ? 'font-semibold text-slate-200 text-[10px]' : 'text-slate-300 text-[10px]'
            )}
          >
            {node.name}
          </button>
        )}
      </div>
      
      {isDirectory && node.isExpanded && (
        <ul className="mt-1 space-y-1">
          {creatingFile === node.path && (
            <li style={{ paddingLeft: padding + 16 }}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500">•</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={newFileNameInput}
                  onChange={(e) => onNewFileNameInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => onCreateFileComplete(node.path)}
                  placeholder="filename..."
                  className="flex-1 bg-slate-700 text-slate-200 px-1 py-0.5 rounded text-[10px] outline-none"
                />
              </div>
            </li>
          )}
          {node.children?.map((child) => (
            <FileNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onCreateFile={onCreateFile}
              renamingNode={renamingNode}
              newFileName={newFileName}
              onNewFileNameChange={onNewFileNameChange}
              onRenameComplete={onRenameComplete}
              creatingFile={creatingFile}
              newFileNameInput={newFileNameInput}
              onNewFileNameInputChange={onNewFileNameInputChange}
              onCreateFileComplete={onCreateFileComplete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}