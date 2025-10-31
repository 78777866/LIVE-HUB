import { describe, it, expect } from '@jest/globals'
import { detectWorkspaceTemplate, type RepositoryManifest } from '@/lib/workspace-detector'

describe('Workspace Template Detector', () => {
  describe('Next.js Detection', () => {
    it('should detect Next.js with high confidence when next dependency is present', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            next: '14.0.0',
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('Next.js dependency found in package.json')
    })

    it('should detect Next.js with medium confidence when next.config.js is present', () => {
      const manifest: RepositoryManifest = {
        hasNextConfig: true,
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('medium')
      expect(result.reason).toBe('Next.js configuration file found')
    })

    it('should detect Next.js with low confidence when repository name suggests it', () => {
      const manifest: RepositoryManifest = {
        repoName: 'my-nextjs-app',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Repository name or description suggests Next.js')
    })

    it('should detect Next.js with low confidence when repository description suggests it', () => {
      const manifest: RepositoryManifest = {
        repoDescription: 'A Next.js application with TypeScript',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Repository name or description suggests Next.js')
    })
  })

  describe('Vite Detection', () => {
    it('should detect Vite with high confidence when vite dependency is present', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          devDependencies: {
            vite: '5.0.0',
            '@vitejs/plugin-react': '4.0.0'
          },
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('vite-react-starter')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('Vite dependency found in package.json')
    })

    it('should detect Vite with medium confidence when vite.config.js is present', () => {
      const manifest: RepositoryManifest = {
        hasViteConfig: true,
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('vite-react-starter')
      expect(result.confidence).toBe('medium')
      expect(result.reason).toBe('Vite configuration file found')
    })

    it('should detect Vite with low confidence when repository name suggests it', () => {
      const manifest: RepositoryManifest = {
        repoName: 'vite-react-project',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('vite-react-starter')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Repository name or description suggests Vite')
    })
  })

  describe('Create React App Detection', () => {
    it('should detect CRA with high confidence when react-scripts dependency is present', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            'react-scripts': '5.0.1',
            react: '18.0.0',
            'react-dom': '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('cra-starter')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe('Create React App dependency (react-scripts) found in package.json')
    })

    it('should detect CRA with medium confidence when CRA scripts are present', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            react: '18.0.0',
            'react-dom': '18.0.0'
          },
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build',
            test: 'react-scripts test',
            eject: 'react-scripts eject'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('cra-starter')
      expect(result.confidence).toBe('medium')
      expect(result.reason).toBe('Create React App script pattern detected')
    })

    it('should detect CRA with low confidence when yarn.lock and React are present', () => {
      const manifest: RepositoryManifest = {
        hasYarnLock: true,
        packageJson: {
          dependencies: {
            react: '18.0.0',
            'react-dom': '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('cra-starter')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('React project with yarn.lock detected (may be Create React App)')
    })

    it('should detect CRA with low confidence when repository name suggests it', () => {
      const manifest: RepositoryManifest = {
        repoName: 'create-react-app-example',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('cra-starter')
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Repository name or description suggests Create React App')
    })
  })

  describe('Unknown/No Match Detection', () => {
    it('should return null templateId for unknown project types', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            express: '4.18.0',
            lodash: '4.17.21'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Unable to determine a suitable template. The repository may use a custom setup or unsupported framework.')
    })

    it('should return null templateId for empty manifest', () => {
      const manifest: RepositoryManifest = {}

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Unable to determine a suitable template. The repository may use a custom setup or unsupported framework.')
    })

    it('should return null templateId for non-JavaScript projects', () => {
      const manifest: RepositoryManifest = {
        repoName: 'python-project',
        repoDescription: 'A Python Django application'
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.reason).toBe('Unable to determine a suitable template. The repository may use a custom setup or unsupported framework.')
    })
  })

  describe('Priority Detection', () => {
    it('should prioritize Next.js over other frameworks when both are present', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            next: '14.0.0',
            vite: '5.0.0',
            'react-scripts': '5.0.1',
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('high')
    })

    it('should prioritize Vite over CRA when both could match', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          dependencies: {
            vite: '5.0.0',
            react: '18.0.0'
          },
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('vite-react-starter')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Edge Cases', () => {
    it('should handle case-insensitive repository names', () => {
      const manifest: RepositoryManifest = {
        repoName: 'My-NEXTJS-App',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('low')
    })

    it('should handle case-insensitive repository descriptions', () => {
      const manifest: RepositoryManifest = {
        repoDescription: 'A VITE React Application',
        packageJson: {
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('vite-react-starter')
      expect(result.confidence).toBe('low')
    })

    it('should detect dependencies in devDependencies as well', () => {
      const manifest: RepositoryManifest = {
        packageJson: {
          devDependencies: {
            next: '14.0.0',
            typescript: '5.0.0'
          },
          dependencies: {
            react: '18.0.0'
          }
        }
      }

      const result = detectWorkspaceTemplate(manifest)

      expect(result.templateId).toBe('nextjs-starter')
      expect(result.confidence).toBe('high')
    })
  })
})
