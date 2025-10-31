import type { FileSystemTree } from '@webcontainer/api'
import { detectPackageManager, inferDevCommand, parsePackageJson } from '@/lib/workspace'

describe('workspace detection utilities', () => {
  function createTree(contents: Record<string, any>, extras: Record<string, any> = {}): FileSystemTree {
    return {
      'package.json': {
        file: {
          contents: JSON.stringify(contents),
        },
      },
      ...extras,
    }
  }

  it('detects Next.js dev command with npm', () => {
    const tree = createTree(
      {
        dependencies: { next: '14.2.4', react: '18.2.0' },
        scripts: { dev: 'next dev', build: 'next build' },
      },
      {
        'package-lock.json': {
          file: { contents: '{}' },
        },
      },
    )

    const pkg = parsePackageJson(tree)
    const packageManager = detectPackageManager(tree)
    const command = inferDevCommand(pkg, packageManager)

    expect(packageManager).toEqual('npm')
    expect(command).not.toBeNull()
    expect(command?.framework).toEqual('next')
    expect(command?.scriptName).toEqual('dev')
    expect(command?.command).toEqual('npm')
    expect(command?.args).toEqual(['run', 'dev'])
    expect(command?.port).toEqual(3000)
  })

  it('detects Vite dev command with pnpm', () => {
    const tree = createTree(
      {
        devDependencies: { vite: '^5.0.0' },
        scripts: { dev: 'vite' },
      },
      {
        'pnpm-lock.yaml': {
          file: { contents: '' },
        },
      },
    )

    const pkg = parsePackageJson(tree)
    const packageManager = detectPackageManager(tree)
    const command = inferDevCommand(pkg, packageManager)

    expect(packageManager).toEqual('pnpm')
    expect(command).not.toBeNull()
    expect(command?.framework).toEqual('vite')
    expect(command?.scriptName).toEqual('dev')
    expect(command?.command).toEqual('pnpm')
    expect(command?.args).toEqual(['dev'])
    expect(command?.port).toEqual(5173)
  })

  it('detects Create React App start command with yarn', () => {
    const tree = createTree(
      {
        dependencies: { 'react-scripts': '^5.0.0' },
        scripts: { start: 'react-scripts start' },
      },
      {
        'yarn.lock': {
          file: { contents: '' },
        },
      },
    )

    const pkg = parsePackageJson(tree)
    const packageManager = detectPackageManager(tree)
    const command = inferDevCommand(pkg, packageManager)

    expect(packageManager).toEqual('yarn')
    expect(command).not.toBeNull()
    expect(command?.framework).toEqual('create-react-app')
    expect(command?.scriptName).toEqual('start')
    expect(command?.command).toEqual('yarn')
    expect(command?.args).toEqual(['start'])
    expect(command?.port).toEqual(3000)
  })

  it('falls back to generic dev script', () => {
    const tree = createTree({ scripts: { dev: 'node server.js' } })

    const pkg = parsePackageJson(tree)
    const packageManager = detectPackageManager(tree)
    const command = inferDevCommand(pkg, packageManager)

    expect(packageManager).toEqual('npm')
    expect(command).not.toBeNull()
    expect(command?.framework).toEqual('custom')
    expect(command?.scriptName).toEqual('dev')
    expect(command?.command).toEqual('npm')
    expect(command?.args).toEqual(['run', 'dev'])
    expect(command?.port).toEqual(3000)
  })

  it('returns null when no scripts apply', () => {
    const tree = createTree({})

    const pkg = parsePackageJson(tree)
    const packageManager = detectPackageManager(tree)
    const command = inferDevCommand(pkg, packageManager)

    expect(packageManager).toEqual('npm')
    expect(command).toBeNull()
  })
})
