import type { WebContainer, WebContainerProcess, FileSystemTree } from '@webcontainer/api'
import type { DevCommandSpec } from '@/lib/workspace'
import { buildFileTreeFromFs, detectPackageManager, inferDevCommand, parsePackageJson } from '@/lib/workspace'
import { getWorkspaceTemplateById } from '@/lib/workspace-templates'
import { syncRepository } from '@/lib/github-sync'
import type { PackageManager, RepositorySummary, WebContainerState } from '@/state/app-store'
import { useAppStore } from '@/state/app-store'

let modulePromise: Promise<typeof import('@webcontainer/api')> | null = null
let webcontainerInstance: WebContainer | null = null
let installProcess: WebContainerProcess | null = null
let devProcess: WebContainerProcess | null = null
let listenersBound = false
let installTerminationCause: 'user' | 'restart' | null = null
let devTerminationCause: 'user' | 'restart' | null = null

export async function launchWorkspace(repository: RepositorySummary): Promise<void> {
  ensureClientEnvironment()

  await prepareFreshInstance()

  const store = useAppStore.getState()
  store.resetConsole()

  updateState({
    status: 'initializing',
    installProgress: 0,
    installPhase: undefined,
    packageManager: undefined,
    framework: 'unknown',
    devCommandLabel: undefined,
    previewPort: undefined,
    previewUrl: undefined,
    error: undefined,
    logs: [],
    lastMessage: 'Booting WebContainer runtime…',
  })

  pushLog(`Launching workspace for ${repository.owner}/${repository.name}…`)

  try {
    const instance = await bootWebContainer()
    pushLog('WebContainer runtime ready.')
    updateState({ lastMessage: 'Syncing repository files…' })

    // Try to sync the actual repository first
    let files: FileSystemTree
    let packageManager: PackageManager
    let hasPackageJson: boolean
    let usedFallback = false

    try {
      const syncResult = await syncRepository({
        owner: repository.owner,
        repo: repository.name,
        branch: repository.selectedBranch || repository.defaultBranch,
        onProgress: (message) => {
          updateState({ lastMessage: message })
          pushLog(message)
        },
      })

      files = syncResult.files
      packageManager = syncResult.packageManager
      hasPackageJson = syncResult.hasPackageJson
      pushLog('Repository files synced successfully.')
    } catch (syncError) {
      pushLog(`Repository sync failed: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`, 'warn')
      
      // Fall back to template if sync fails
      const template = getWorkspaceTemplateById(repository.workspaceTemplateId || 'nextjs-starter')
      if (!template) {
        throw new Error(`No workspace template available for ${repository.name} and repository sync failed.`)
      }

      files = template.files
      packageManager = detectPackageManager(template.files)
      hasPackageJson = !!parsePackageJson(template.files)
      usedFallback = true
      
      pushLog('Falling back to workspace template.', 'warn')
      updateState({ lastMessage: 'Using template fallback due to sync failure.' })
    }

    await instance.mount(files)
    store.setFileTree(buildFileTreeFromFs(files))
    pushLog(`Filesystem mounted inside WebContainer (${usedFallback ? 'template' : 'synced repository'}).`)

    if (!hasPackageJson) {
      throw new Error('No package.json found in the repository. Cannot determine project structure.')
    }

    updateState({
      status: 'installing-dependencies',
      packageManager,
      installProgress: 5,
      installPhase: 'starting',
      lastMessage: `Installing dependencies with ${packageManager}…`,
    })
    pushLog(`Installing dependencies with ${packageManager}…`)

    const packageJson = parsePackageJson(files)
    const promptFn = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt.bind(window)
      : undefined
    const devCommand = inferDevCommand(packageJson, packageManager, { promptFn })

    if (!devCommand) {
      throw new Error('Unable to determine the development server command. Define a dev or start script in package.json.')
    }

    updateState({
      framework: devCommand.framework,
      devCommandLabel: devCommand.display,
      previewPort: undefined,
      previewUrl: undefined,
    })

    const installExitCode = await runInstall(instance, packageManager)

    if (installTerminationCause === 'user') {
      return
    }

    if (installExitCode !== 0) {
      throw new Error(`Dependency installation failed with exit code ${installExitCode}. Check the console for details.`)
    }

    updateState({
      status: 'starting-dev-server',
      installProgress: 100,
      installPhase: undefined,
      lastMessage: `Starting dev server (${devCommand.display})…`,
    })
    pushLog(`Starting dev server via ${devCommand.display}…`)

    await runDevServer(instance, devCommand, usedFallback ? getWorkspaceTemplateById(repository.workspaceTemplateId || 'nextjs-starter')?.defaultPort || 3000 : 3000)
  } catch (error) {
    reportError(error)
  }
}

export async function cancelInstallation(): Promise<void> {
  if (!installProcess) {
    return
  }

  installTerminationCause = 'user'

  try {
    await installProcess.kill()
  } catch (error) {
    console.error('Failed to cancel installation', error)
  } finally {
    installProcess = null
  }

  updateState({
    status: 'idle',
    installProgress: 0,
    installPhase: undefined,
    lastMessage: 'Installation cancelled by user.',
  })
  pushLog('Dependency installation cancelled by user request.', 'warn')
}

export async function stopDevServer(): Promise<void> {
  if (!devProcess) {
    return
  }

  devTerminationCause = 'user'

  try {
    await devProcess.kill()
  } catch (error) {
    console.error('Failed to stop dev server', error)
  } finally {
    devProcess = null
  }

  updateState({
    status: 'idle',
    lastMessage: 'Development server stopped.',
    previewPort: undefined,
    previewUrl: undefined,
  })
  pushLog('Development server stopped by user.', 'info')
}

async function runInstall(instance: WebContainer, packageManager: PackageManager): Promise<number> {
  const commandArgs = packageManager === 'yarn' ? ['install'] : ['install']

  const process = await instance.spawn(packageManager, commandArgs)
  installProcess = process
  installTerminationCause = null

  pipeProcessOutput(process, (chunk) => {
    if (!chunk.trim()) {
      return
    }

    const currentProgress = useAppStore.getState().webContainer.installProgress
    if (currentProgress < 95) {
      updateState({ installProgress: Math.min(95, currentProgress + 3) })
    }
  })

  const exitCode = await process.exit

  installProcess = null

  if (installTerminationCause === 'restart') {
    return exitCode ?? 0
  }

  if (installTerminationCause === 'user') {
    return exitCode ?? 0
  }

  updateState({ lastMessage: exitCode === 0 ? 'Dependencies installed successfully.' : 'Dependency installation encountered an error.' })

  return exitCode ?? 0
}

async function runDevServer(instance: WebContainer, devCommand: DevCommandSpec, defaultPort: number): Promise<void> {
  const env = {
    ...(devCommand.port ? { PORT: String(devCommand.port) } : {}),
    BROWSER: 'none',
  }

  devProcess = await instance.spawn(devCommand.command, devCommand.args, { env })
  devTerminationCause = null

  pipeProcessOutput(devProcess)

  devProcess.exit
    .then((code) => {
      devProcess = null
      const cause = devTerminationCause
      devTerminationCause = null

      if (cause === 'restart') {
        pushLog('Development server stopped in preparation for restart.', 'info')
        return
      }

      if (cause === 'user') {
        return
      }

      if (code !== 0) {
        const message = `Dev server exited unexpectedly (code ${code}).`
        updateState({
          status: 'error',
          lastMessage: message,
          error: message,
          previewPort: undefined,
          previewUrl: undefined,
        })
        pushLog(message, 'error')
      }
    })
    .catch((error) => {
      console.error('Failed to observe dev server exit', error)
    })

  if (!listenersBound) {
    bindInstanceEvents(instance)
  }

  // Default port hint until server-ready fires
  updateState({ previewPort: defaultPort })
}

async function prepareFreshInstance(): Promise<void> {
  // If an installation is ongoing, terminate it silently
  if (installProcess) {
    installTerminationCause = 'restart'
    try {
      await installProcess.kill()
    } catch (error) {
      console.error('Failed to terminate prior installation', error)
    } finally {
      installProcess = null
    }
  }

  if (devProcess) {
    devTerminationCause = 'restart'
    try {
      await devProcess.kill()
    } catch (error) {
      console.error('Failed to terminate prior dev server', error)
    } finally {
      devProcess = null
    }
  }

  if (webcontainerInstance) {
    try {
      webcontainerInstance.teardown()
    } catch (error) {
      console.error('Failed to teardown previous WebContainer instance', error)
    }
    webcontainerInstance = null
    listenersBound = false
  }
}

async function bootWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance
  }

  const mod = await loadModule()

  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    throw new Error('WebContainers require service worker support, which is unavailable in this browser.')
  }

  webcontainerInstance = await mod.WebContainer.boot()
  listenersBound = false

  await navigator.serviceWorker.ready.catch(() => undefined)

  bindInstanceEvents(webcontainerInstance)

  return webcontainerInstance
}

function bindInstanceEvents(instance: WebContainer) {
  if (listenersBound) {
    return
  }

  instance.on('server-ready', (port, url) => {
    updateState({
      status: 'ready',
      lastMessage: `Development server ready on port ${port}.`,
      previewPort: port,
      previewUrl: url,
      installProgress: 100,
      installPhase: undefined,
    })
    pushLog(`Development server is ready at ${url}.`)
  })

  instance.on('error', (event) => {
    const message = event?.message ?? 'WebContainer runtime error.'
    updateState({ status: 'error', error: message, lastMessage: message })
    pushLog(message, 'error')
  })

  listenersBound = true
}

function pipeProcessOutput(process: WebContainerProcess, onChunk?: (chunk: string) => void) {
  const writable = new WritableStream<string | Uint8Array>({
    write(chunk) {
      const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
      onChunk?.(text)

      text
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .forEach((line) => {
          const lower = line.toLowerCase()
          let level: 'info' | 'warn' | 'error' = 'info'

          if (lower.includes('error') || lower.includes('err!')) {
            level = 'error'
          } else if (lower.includes('warn')) {
            level = 'warn'
          }

          pushLog(line, level)
        })
    },
  })

  process.output.pipeTo(writable).catch((error) => {
    console.error('Failed to pipe process output', error)
  })
}

function ensureClientEnvironment() {
  if (typeof window === 'undefined') {
    throw new Error('WebContainers can only be used in the browser environment.')
  }
}

async function loadModule() {
  if (!modulePromise) {
    modulePromise = import('@webcontainer/api')
  }

  return modulePromise
}

function updateState(state: Partial<WebContainerState>) {
  useAppStore.getState().setWebContainerState(state)
}

function pushLog(text: string, level: 'info' | 'warn' | 'error' = 'info') {
  useAppStore.getState().pushConsoleLine({ level, text })
}

function reportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(error)
  updateState({ status: 'error', error: message, lastMessage: message })
  pushLog(message, 'error')
}
