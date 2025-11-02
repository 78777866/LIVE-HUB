'use client'

import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { PanelShell } from '@/components/panels/PanelShell'
import { useAppStore } from '@/state/app-store'
import { cn } from '@/lib/utils'

const placeholderCode = `import { useEffect } from 'react'
import { useAppStore } from '@/state/app-store'

export function WorkspaceInitializer() {
  const setWebContainerState = useAppStore((state) => state.setWebContainerState)

  useEffect(() => {
    setWebContainerState({ status: 'initializing' })
  }, [setWebContainerState])

  return null
}`

export function EditorPanel() {
  const editorRef = useRef<any>(null)
  const webContainer = useAppStore((state) => state.webContainer)
  const openFiles = useAppStore((state) => state.openFiles)
  const activeFilePath = useAppStore((state) => state.activeFilePath)
  const updateFileContent = useAppStore((state) => state.updateFileContent)
  const closeFile = useAppStore((state) => state.closeFile)

  const activeFile = openFiles.find((f) => f.path === activeFilePath)

  const status =
    webContainer.status === 'ready'
      ? 'ready'
      : webContainer.status === 'error'
        ? 'error'
        : webContainer.status === 'idle'
          ? 'idle'
          : 'loading'
  const statusLabel = webContainer.status.replace(/-/g, ' ')
  const packageManagerLabel = webContainer.packageManager?.toUpperCase() ?? 'AUTO'
  const commandLabel = webContainer.devCommandLabel ?? 'Detecting…'

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFile) {
      updateFileContent(activeFile.path, value)
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      wordWrap: 'on',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        indentation: true,
        bracketPairs: true,
      },
    })
  }

  return (
    <PanelShell
      title="Editor"
      status={status}
      className="flex-1"
      autoExpand={true}
      toolbar={
        <div className="flex items-center gap-1 text-[9px] text-slate-400">
          {activeFile && (
            <span className="rounded-full border border-slate-700 px-1.5 py-0.5 uppercase tracking-[0.15em]">
              {activeFile.language.toUpperCase()}
            </span>
          )}
          <span className="rounded-full border border-slate-700 px-1.5 py-0.5 uppercase tracking-[0.15em]">
            Monaco
          </span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {/* File Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800/80 bg-slate-950/70 px-2 py-1.5 text-[9px] uppercase tracking-[0.15em] text-slate-400 overflow-x-auto">
          {openFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => useAppStore.getState().setActiveFile(file.path)}
              className={cn(
                'flex items-center gap-1 rounded border border-transparent px-1.5 py-0.5 text-left transition-colors duration-default whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-default',
                file.path === activeFilePath
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                  : 'hover:border-slate-700 hover:bg-slate-800/50 text-slate-400'
              )}
            >
              <span className="max-w-[100px] truncate">{file.name}</span>
              {file.isDirty && (
                <span className="text-sky-400">●</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeFile(file.path)
                }}
                className="ml-0.5 text-slate-500 hover:text-slate-300"
              >
                ×
              </button>
            </button>
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="relative flex-1 overflow-hidden">
          {activeFile ? (
            <Editor
              height="100%"
              language={activeFile.language}
              value={activeFile.content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 12,
                fontFamily: 'JetBrains Mono, Monaco, Consolas, "Courier New", monospace',
                lineNumbers: 'on',
                minimap: { enabled: true },
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                guides: {
                  indentation: true,
                  bracketPairs: true,
                },
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-sm">No file selected</p>
                <p className="text-[10px] mt-1">Select a file to edit</p>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[8px] uppercase tracking-[0.15em] text-slate-500">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>
              Status: <span className="text-slate-300">{statusLabel}</span>
            </span>
            <span>
              PM: <span className="text-slate-300">{packageManagerLabel}</span>
            </span>
            <span>
              Cmd: <span className="text-slate-300 normal-case tracking-tight">{commandLabel}</span>
            </span>
            {activeFile && (
              <span className="max-w-[80px] truncate">
                File: <span className="text-slate-300 normal-case tracking-tight">{activeFile.name}</span>
              </span>
            )}
          </div>
          {webContainer.lastMessage ? (
            <p className="mt-1 text-[8px] tracking-[0.1em] text-slate-400 normal-case truncate">
              {webContainer.lastMessage}
            </p>
          ) : null}
        </footer>
      </div>
    </PanelShell>
  )
}