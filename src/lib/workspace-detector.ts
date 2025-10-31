import type { WorkspaceTemplateId } from './workspace-templates'

export interface RepositoryManifest {
  packageJson?: any
  hasPackageLock?: boolean
  hasYarnLock?: boolean
  hasPnpmLock?: boolean
  hasNextConfig?: boolean
  hasViteConfig?: boolean
  repoName?: string
  repoDescription?: string
}

export interface DetectionResult {
  templateId: WorkspaceTemplateId | null
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Detects the appropriate workspace template for a repository based on its manifest and metadata.
 */
export function detectWorkspaceTemplate(manifest: RepositoryManifest): DetectionResult {
  const { packageJson, hasPackageLock, hasYarnLock, hasPnpmLock, hasNextConfig, hasViteConfig, repoName, repoDescription } = manifest

  // Next.js detection
  const nextResult = detectNextJs(packageJson, hasNextConfig || false, repoName, repoDescription)
  if (nextResult) {
    return nextResult
  }

  // Vite detection
  const viteResult = detectVite(packageJson, hasViteConfig || false, repoName, repoDescription)
  if (viteResult) {
    return viteResult
  }

  // Create React App detection
  const craResult = detectCreateReactApp(packageJson, hasYarnLock || false, repoName, repoDescription)
  if (craResult) {
    return craResult
  }

  // No match found
  return {
    templateId: null,
    confidence: 'low',
    reason: 'Unable to determine a suitable template. The repository may use a custom setup or unsupported framework.'
  }
}

function detectNextJs(
  packageJson: any,
  hasNextConfig: boolean,
  repoName?: string,
  repoDescription?: string
): DetectionResult | null {
  const deps = packageJson?.dependencies || {}
  const devDeps = packageJson?.devDependencies || {}
  const allDeps = { ...deps, ...devDeps }

  // High confidence: Next.js dependency explicitly present
  if (allDeps.next) {
    return {
      templateId: 'nextjs-starter',
      confidence: 'high',
      reason: 'Next.js dependency found in package.json'
    }
  }

  // Medium confidence: next.config.js/ts file present
  if (hasNextConfig) {
    return {
      templateId: 'nextjs-starter',
      confidence: 'medium',
      reason: 'Next.js configuration file found'
    }
  }

  // Low confidence: naming conventions suggest Next.js
  const nameIndicators = ['next', 'nextjs', 'next-app']
  const descIndicators = ['next.js', 'next app', 'nextjs']
  
  if (matchesIndicators(repoName, nameIndicators) || matchesIndicators(repoDescription, descIndicators)) {
    return {
      templateId: 'nextjs-starter',
      confidence: 'low',
      reason: 'Repository name or description suggests Next.js'
    }
  }

  return null
}

function detectVite(
  packageJson: any,
  hasViteConfig: boolean,
  repoName?: string,
  repoDescription?: string
): DetectionResult | null {
  const deps = packageJson?.dependencies || {}
  const devDeps = packageJson?.devDependencies || {}
  const allDeps = { ...deps, ...devDeps }

  // High confidence: Vite dependency explicitly present
  if (allDeps.vite) {
    return {
      templateId: 'vite-react-starter',
      confidence: 'high',
      reason: 'Vite dependency found in package.json'
    }
  }

  // Medium confidence: vite.config.js/ts file present
  if (hasViteConfig) {
    return {
      templateId: 'vite-react-starter',
      confidence: 'medium',
      reason: 'Vite configuration file found'
    }
  }

  // Low confidence: naming conventions suggest Vite
  const nameIndicators = ['vite', 'vite-app', 'vite-react']
  const descIndicators = ['vite', 'vite app', 'vite react']
  
  if (matchesIndicators(repoName, nameIndicators) || matchesIndicators(repoDescription, descIndicators)) {
    return {
      templateId: 'vite-react-starter',
      confidence: 'low',
      reason: 'Repository name or description suggests Vite'
    }
  }

  return null
}

function detectCreateReactApp(
  packageJson: any,
  hasYarnLock: boolean,
  repoName?: string,
  repoDescription?: string
): DetectionResult | null {
  const deps = packageJson?.dependencies || {}
  const scripts = packageJson?.scripts || {}

  // High confidence: react-scripts dependency present
  if (deps['react-scripts']) {
    return {
      templateId: 'cra-starter',
      confidence: 'high',
      reason: 'Create React App dependency (react-scripts) found in package.json'
    }
  }

  // Medium confidence: CRA-specific scripts present
  const craScripts = ['start', 'build', 'test', 'eject']
  const hasCraScripts = craScripts.every(script => scripts[script])
  if (hasCraScripts && deps.react && deps['react-dom']) {
    return {
      templateId: 'cra-starter',
      confidence: 'medium',
      reason: 'Create React App script pattern detected'
    }
  }

  // Low confidence: yarn.lock + React setup
  if (hasYarnLock && deps.react && deps['react-dom']) {
    return {
      templateId: 'cra-starter',
      confidence: 'low',
      reason: 'React project with yarn.lock detected (may be Create React App)'
    }
  }

  // Low confidence: naming conventions suggest CRA
  const nameIndicators = ['create-react-app', 'cra-app', 'react-app']
  const descIndicators = ['create react app', 'cra', 'react app']
  
  if (matchesIndicators(repoName, nameIndicators) || matchesIndicators(repoDescription, descIndicators)) {
    return {
      templateId: 'cra-starter',
      confidence: 'low',
      reason: 'Repository name or description suggests Create React App'
    }
  }

  return null
}

function matchesIndicators(text: string | undefined, indicators: string[]): boolean {
  if (!text) return false
  const lowercaseText = text.toLowerCase()
  return indicators.some(indicator => lowercaseText.includes(indicator))
}

/**
 * Fetches and parses repository manifest data from GitHub API.
 */
export async function fetchRepositoryManifest(
  owner: string,
  repo: string,
  token: string
): Promise<RepositoryManifest> {
  const manifest: RepositoryManifest = {
    repoName: repo,
    repoDescription: undefined
  }

  try {
    // Fetch repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (repoResponse && repoResponse.ok) {
      const repoData = await repoResponse.json()
      manifest.repoDescription = repoData.description
    }

    // Try to fetch package.json
    try {
      const packageJsonResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (packageJsonResponse && packageJsonResponse.ok) {
        const packageJsonData = await packageJsonResponse.json()
        if (packageJsonData.content) {
          const content = atob(packageJsonData.content)
          manifest.packageJson = JSON.parse(content)
        }
      }
    } catch {
      // package.json not found or not accessible
    }

    // Check for lockfiles and config files
    const filesToCheck = [
      { name: 'package-lock.json', prop: 'hasPackageLock' },
      { name: 'yarn.lock', prop: 'hasYarnLock' },
      { name: 'pnpm-lock.yaml', prop: 'hasPnpmLock' },
      { name: 'next.config.js', prop: 'hasNextConfig' },
      { name: 'next.config.ts', prop: 'hasNextConfig' },
      { name: 'vite.config.js', prop: 'hasViteConfig' },
      { name: 'vite.config.ts', prop: 'hasViteConfig' }
    ]

    for (const { name, prop } of filesToCheck) {
      try {
        const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${name}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })

        if (fileResponse && fileResponse.ok) {
          (manifest as any)[prop] = true
        }
      } catch {
        // File not found or not accessible
      }
    }

  } catch (error) {
    console.warn('Failed to fetch repository manifest:', error)
  }

  return manifest
}
