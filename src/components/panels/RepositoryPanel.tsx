'use client'

import { useState } from 'react'
import { PanelShell } from '@/components/panels/PanelShell'
import { useAppStore } from '@/state/app-store'
import { launchWorkspace, cancelInstallation, stopDevServer } from '@/lib/webcontainer-client'
import { useRepoData } from '@/hooks/useRepoData'
import { useBranches, type Branch } from '@/hooks/useBranches'
import { usePersistence } from '@/hooks/usePersistence'
import { cn } from '@/lib/utils'

export function RepositoryPanel() {
  const repositories = useAppStore((state) => state.repositories)
  const selectedRepositoryId = useAppStore((state) => state.selectedRepositoryId)
  const selectedBranch = useAppStore((state) => state.selectedBranch)
  const selectRepository = useAppStore((state) => state.selectRepository)
  const selectBranch = useAppStore((state) => state.selectBranch)
  const webContainer = useAppStore((state) => state.webContainer)
  
  // Local state for search filtering
  const [searchQuery, setSearchQuery] = useState('')

  // Use the new hooks for fetching data
  const { 
    repositories: fetchedRepos, 
    loading: reposLoading, 
    error: reposError,
    hasMore,
    fetchNextPage,
    refetch: refetchRepos
  } = useRepoData({ perPage: 20, sort: 'updated', direction: 'desc' })

  const selectedRepository = repositories.find((repository) => repository.id === selectedRepositoryId)
  
  // Fetch branches for selected repository
  const {
    branches,
    loading: branchesLoading,
    error: branchesError,
    setSelectedBranch
  } = useBranches({ 
    owner: selectedRepository?.owner || '', 
    repo: selectedRepository?.name || '' 
  })

  const { saveLastBranch } = usePersistence()

  // Find the selected branch details from the branches array
  const selectedBranchDetails = Array.isArray(branches)
    ? branches.find(b => b?.name === selectedBranch) ?? null
    : null

  // Filter repositories based on search query (client-side filtering)
  const filteredRepositories = repositories.filter((repo) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.owner.toLowerCase().includes(query) ||
      `${repo.owner}/${repo.name}`.toLowerCase().includes(query)
    )
  })

  const status = reposLoading ? 'loading' : reposError ? 'error' : 'ready'
  const statusLabel = webContainer.status.replace(/-/g, ' ')
  const isLaunching =
    webContainer.status === 'initializing' ||
    webContainer.status === 'installing-dependencies' ||
    webContainer.status === 'starting-dev-server'
  const canCancelInstall = webContainer.status === 'installing-dependencies'
  const canStopServer = webContainer.status === 'ready' || webContainer.status === 'starting-dev-server'
  const packageManagerLabel = webContainer.packageManager
    ? webContainer.packageManager.toUpperCase()
    : 'Auto'
  const frameworkLabel = formatFramework(webContainer.framework)
  const commandLabel = webContainer.devCommandLabel ?? 'Detecting…'
  const previewLabel = webContainer.previewPort ? `:${webContainer.previewPort}` : 'Pending'

  const getTemplateInfo = () => {
    if (!selectedRepository?.workspaceTemplateId) {
      return { label: 'Template', value: 'Unknown', warning: true }
    }
    
    const templateLabels: Record<string, string> = {
      'nextjs-starter': 'Next.js',
      'vite-react-starter': 'Vite + React',
      'cra-starter': 'Create React App'
    }
    
    return {
      label: 'Template',
      value: templateLabels[selectedRepository.workspaceTemplateId] || selectedRepository.workspaceTemplateId,
      warning: false
    }
  }

  const templateInfo = getTemplateInfo()
  
  const metadataRows = [
    { label: 'Status', value: statusLabel },
    { label: 'Template', value: templateInfo.value, warning: templateInfo.warning },
    { label: 'PM', value: packageManagerLabel },
    { label: 'Framework', value: frameworkLabel },
    { label: 'Command', value: commandLabel },
    { label: 'Port', value: previewLabel },
  ]

  function handleLaunch() {
    if (!selectedRepository || isLaunching) {
      return
    }

    void launchWorkspace(selectedRepository)
  }

  function handleCancel() {
    if (!canCancelInstall) {
      return
    }

    void cancelInstallation()
  }

  function handleStop() {
    if (!canStopServer) {
      return
    }

    void stopDevServer()
  }

  function handleBranchChange(branchName: string) {
    setSelectedBranch(branchName)
    // Persistence is now handled automatically by the usePersistence hook
  }


  return (
    <PanelShell
      title="Repository"
      status={status}
      autoExpand={true}
    >
      <div className="flex h-full flex-col gap-2 p-2">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search repos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label="Clear search"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Error State */}
        {reposError && (
          <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 p-2 text-rose-100 text-[10px]">
            <p className="font-semibold mb-1">Failed to load</p>
            <p className="text-rose-200 mb-1">{reposError}</p>
            <button
              onClick={refetchRepos}
              className="text-[9px] bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/60 rounded px-1.5 py-0.5 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {reposLoading && repositories.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mb-1"></div>
              <p className="text-[10px] text-slate-400">Loading...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!reposLoading && !reposError && filteredRepositories.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 mb-1">
                {searchQuery ? 'No repos found' : 'No repos'}
              </p>
              <p className="text-[9px] text-slate-500">
                {searchQuery ? 'Try again' : 'Connect GitHub'}
              </p>
            </div>
          </div>
        )}

        {/* Repository List */}
        <ul className="flex-1 overflow-y-auto pr-0.5 space-y-1.5">
          {filteredRepositories.map((repository) => {
            const isActive = repository.id === selectedRepositoryId
            return (
              <li key={repository.id}>
                <button
                  type="button"
                  onClick={() => selectRepository(repository.id)}
                  className={cn(
                    'w-full rounded-lg border px-2 py-1.5 text-left transition',
                    'border-slate-800/60 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900/90',
                    isActive
                      ? 'border-sky-500/60 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                      : undefined,
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-100 truncate">
                        {repository.owner}/{repository.name}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-400 line-clamp-1">
                        {repository.description ?? 'No description'}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-300 whitespace-nowrap">
                      {repository.defaultBranch}
                    </span>
                  </div>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-slate-500">
                    Updated {new Intl.DateTimeFormat('en', {
                      hour: 'numeric',
                      minute: 'numeric',
                    }).format(new Date(repository.updatedAt))}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Load More Button */}
        {hasMore && !reposLoading && (
          <button
            onClick={fetchNextPage}
            className="w-full py-1 text-[9px] text-slate-400 hover:text-slate-200 transition border border-slate-800/60 rounded-lg hover:border-slate-600"
          >
            Load more...
          </button>
        )}

        {/* Pagination Loading */}
        {reposLoading && repositories.length > 0 && (
          <div className="text-center py-1">
            <div className="inline-block animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-sky-500"></div>
          </div>
        )}

        {/* Workspace Controls */}
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-2 text-[9px] text-slate-300">
          <div className="space-y-2">
            {/* Branch Selector */}
            {selectedRepository && (
              <div className="space-y-1">
                <label className="text-[8px] uppercase tracking-[0.15em] text-slate-500">
                  Branch
                </label>
                {branchesLoading ? (
                  <div className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-2 w-2 border-b border-slate-400"></div>
                    <span className="text-[9px] text-slate-400">Loading...</span>
                  </div>
                ) : branchesError ? (
                  <div className="text-[9px] text-rose-400">{branchesError}</div>
                ) : branches.length > 0 ? (
                  <>
                    <select
                      value={selectedBranch || ''}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-1.5 py-1 text-[9px] text-slate-200 focus:border-sky-500 focus:outline-none"
                    >
                      {branches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {formatBranchOptionLabel(branch)}
                        </option>
                      ))}
                    </select>
                    {selectedBranchDetails ? (
                      <BranchMetadataCard branch={selectedBranchDetails} />
                    ) : null}
                  </>
                ) : (
                  <div className="text-[9px] text-slate-400">No branches</div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1 text-[8px] uppercase tracking-[0.15em]">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={!selectedRepository || isLaunching}
                className={cn(
                  'rounded-full border px-2 py-1 transition',
                  'border-sky-600/60 bg-sky-600/20 text-sky-200 hover:border-sky-400 hover:bg-sky-500/30',
                  (!selectedRepository || isLaunching) &&
                    'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-500',
                )}
              >
                Boot
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={!canCancelInstall}
                className={cn(
                  'rounded-full border px-2 py-1 transition',
                  'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:bg-amber-500/20',
                  !canCancelInstall &&
                    'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-500',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!canStopServer}
                className={cn(
                  'rounded-full border px-2 py-1 transition',
                  'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:border-rose-400 hover:bg-rose-500/20',
                  !canStopServer &&
                    'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-500',
                )}
              >
                Stop
              </button>
            </div>

            <div className="grid gap-1 text-[8px] text-slate-400 grid-cols-2">
              {metadataRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between gap-1 rounded border bg-slate-900/40 px-1.5 py-1 ${
                    (row as any).warning 
                      ? 'border-amber-500/60 bg-amber-500/5' 
                      : 'border-slate-800/70'
                  }`}
                >
                  <span className="uppercase tracking-[0.15em] text-slate-500 text-[7px]">{row.label}</span>
                  <span className={`tracking-tight ${
                    (row as any).warning ? 'text-amber-300' : 'text-slate-200'
                  }`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Template warning message */}
            {templateInfo.warning && selectedRepository && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-1.5 text-amber-100 text-[9px]">
                <p className="font-semibold mb-0.5">Template Not Detected</p>
                <p className="text-amber-200">
                  Auto-detection failed. Manual setup may be required.
                </p>
              </div>
            )}

            {webContainer.status === 'installing-dependencies' ? (
              <div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800/70">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${Math.max(6, Math.min(100, Math.round(webContainer.installProgress)))}%` }}
                  />
                </div>
                <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-slate-500">
                  Installing… {Math.round(webContainer.installProgress)}%
                </p>
              </div>
            ) : null}

            {webContainer.lastMessage ? (
              <p className="text-slate-400 text-[9px] truncate">{webContainer.lastMessage}</p>
            ) : null}

            {webContainer.error ? (
              <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 p-1.5 text-rose-100 text-[9px]">
                {webContainer.error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </PanelShell>
  )
}

function BranchMetadataCard({ branch }: { branch: Branch }) {
  const message = summarizeCommitMessage(branch.commit.message, 60)
  const shaSlice = branch.commit.sha ? branch.commit.sha.slice(0, 7) : '—'
  const committedAt = formatCommitTimestamp(branch.commit.committedDate, {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <div className="mt-1.5 space-y-1.5 rounded border border-slate-800/60 bg-slate-900/40 p-1.5 text-[9px] text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-semibold text-slate-100 truncate">{branch.name}</span>
          {branch.protected ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[7px] font-semibold uppercase tracking-[0.15em] text-amber-200 whitespace-nowrap flex-shrink-0">
              Protected
            </span>
          ) : null}
        </div>
        {committedAt ? (
          <span className="text-[8px] uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">{committedAt}</span>
        ) : null}
      </div>
      <p className="text-[9px] text-slate-300 break-words line-clamp-2">{message}</p>
      <div className="flex flex-wrap items-center justify-between gap-1 text-[8px] uppercase tracking-[0.15em] text-slate-500">
        <span className="whitespace-nowrap">SHA {shaSlice}</span>
        {branch.commit.authorName ? (
          <span className="normal-case tracking-normal text-slate-400 truncate max-w-[80px]">{branch.commit.authorName}</span>
        ) : null}
      </div>
    </div>
  )
}

function summarizeCommitMessage(message?: string, length = 60) {
  if (!message) {
    return 'No commit message available.'
  }

  const summary = message.split('\n')[0]?.trim() ?? ''
  if (!summary) {
    return 'No commit message available.'
  }

  if (summary.length <= length) {
    return summary
  }

  return `${summary.slice(0, length - 1)}…`
}

function formatBranchOptionLabel(branch: Branch): string {
  const baseLabel = branch.protected ? `🔒 ${branch.name}` : branch.name
  const sha = branch.commit.sha ? branch.commit.sha.slice(0, 7) : null
  const message = summarizeCommitMessage(branch.commit.message, 24)
  const timestamp = formatCommitTimestamp(branch.commit.committedDate)

  const parts = [baseLabel]

  if (sha) {
    parts.push(sha)
  }

  if (message && message !== 'No commit message available.') {
    parts.push(message)
  }

  if (timestamp) {
    parts.push(timestamp)
  }

  // Limit the total length to prevent overflow
  const fullLabel = parts.join(' • ')
  return fullLabel.length > 40 ? `${fullLabel.substring(0, 37)}...` : fullLabel
}

function formatCommitTimestamp(value?: string, options?: Intl.DateTimeFormatOptions): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  try {
    return new Intl.DateTimeFormat(
      'en',
      options ?? {
        month: 'short',
        day: 'numeric',
      },
    ).format(date)
  } catch {
    return null
  }
}

function formatFramework(framework?: string) {
  const labels: Record<string, string> = {
    next: 'Next.js',
    vite: 'Vite',
    'create-react-app': 'Create React App',
    custom: 'Custom script',
    unknown: 'Unknown',
  }

  if (!framework) {
    return labels.unknown
  }

  return labels[framework] ?? framework
}