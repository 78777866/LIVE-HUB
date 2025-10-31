import type { FileSystemTree } from '@webcontainer/api'

export type WorkspaceTemplateId = 'nextjs-starter' | 'vite-react-starter' | 'cra-starter'

export type WorkspaceTemplate = {
  id: WorkspaceTemplateId
  label: string
  description: string
  defaultPort: number
  files: FileSystemTree
}

const NEXT_PACKAGE_JSON = `{
  "name": "nextjs-starter",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.4",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
`

const NEXT_PACKAGE_LOCK = `{
  "name": "nextjs-starter",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {}
}
`

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
`

const NEXT_LAYOUT = `import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-2xl p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
`

const NEXT_PAGE = `export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Next.js starter</h1>
      <p className="text-slate-300">
        This template boots a minimal Next.js App Router project inside the WebContainer runtime.
      </p>
    </section>
  )
}
`

const NEXT_GLOBALS = `:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
}

body {
  margin: 0;
  background: #020617;
}
`

const NEXT_TS_CONFIG = `{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`

const NEXT_ENV_D_TS = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`

const nextStarter: FileSystemTree = {
  'package.json': {
    file: {
      contents: NEXT_PACKAGE_JSON,
    },
  },
  'package-lock.json': {
    file: {
      contents: NEXT_PACKAGE_LOCK,
    },
  },
  'next.config.js': {
    file: {
      contents: NEXT_CONFIG,
    },
  },
  app: {
    directory: {
      'layout.tsx': {
        file: {
          contents: NEXT_LAYOUT,
        },
      },
      'page.tsx': {
        file: {
          contents: NEXT_PAGE,
        },
      },
      'globals.css': {
        file: {
          contents: NEXT_GLOBALS,
        },
      },
    },
  },
  'tsconfig.json': {
    file: {
      contents: NEXT_TS_CONFIG,
    },
  },
  'next-env.d.ts': {
    file: {
      contents: NEXT_ENV_D_TS,
    },
  },
}

const VITE_PACKAGE_JSON = `{
  "name": "vite-react-starter",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "5.0.0",
    "typescript": "5.3.2",
    "vite": "5.0.13"
  }
}
`

const VITE_PNPM_LOCK = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      react:
        specifier: 18.2.0
        version: 18.2.0
      react-dom:
        specifier: 18.2.0
        version: 18.2.0(react@18.2.0)
    devDependencies:
      '@vitejs/plugin-react':
        specifier: 5.0.0
        version: 5.0.0(vite@5.0.13)
      typescript:
        specifier: 5.3.2
        version: 5.3.2
      vite:
        specifier: 5.0.13
        version: 5.0.13
`

const VITE_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

const VITE_MAIN_TSX = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`

const VITE_APP_TSX = `export function App() {
  return (
    <div style={{ padding: '3rem', fontFamily: 'system-ui' }}>
      <h1>Vite + React starter</h1>
      <p>The dev server runs on port 5173 by default.</p>
    </div>
  )
}
`

const VITE_INDEX_CSS = `:root {
  color-scheme: dark;
  background: #0f172a;
  color: #e2e8f0;
}

body {
  margin: 0;
}
`

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`

const VITE_TS_CONFIG = `{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`

const VITE_TS_NODE_CONFIG = `{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
`

const viteStarter: FileSystemTree = {
  'package.json': {
    file: {
      contents: VITE_PACKAGE_JSON,
    },
  },
  'pnpm-lock.yaml': {
    file: {
      contents: VITE_PNPM_LOCK,
    },
  },
  'index.html': {
    file: {
      contents: VITE_INDEX_HTML,
    },
  },
  src: {
    directory: {
      'main.tsx': {
        file: {
          contents: VITE_MAIN_TSX,
        },
      },
      'App.tsx': {
        file: {
          contents: VITE_APP_TSX,
        },
      },
      'index.css': {
        file: {
          contents: VITE_INDEX_CSS,
        },
      },
    },
  },
  'vite.config.ts': {
    file: {
      contents: VITE_CONFIG,
    },
  },
  'tsconfig.json': {
    file: {
      contents: VITE_TS_CONFIG,
    },
  },
  'tsconfig.node.json': {
    file: {
      contents: VITE_TS_NODE_CONFIG,
    },
  },
}

const CRA_PACKAGE_JSON = `{
  "name": "cra-starter",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
`

const CRA_YARN_LOCK = `# THIS IS A DUMMY LOCKFILE FOR DEMONSTRATION PURPOSES
"react@18.2.0":
  version "18.2.0"
"react-dom@18.2.0":
  version "18.2.0"
"react-scripts@5.0.1":
  version "5.0.1"
`

const CRA_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CRA starter</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`

const CRA_INDEX_JS = `import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`

const CRA_APP_JS = `import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Create React App starter</h1>
        <p>The development server will run on port 3000.</p>
      </header>
    </div>
  )
}

export default App
`

const CRA_APP_CSS = `.App {
  text-align: center;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #020617;
  color: #e2e8f0;
}

.App-header {
  font-family: system-ui, sans-serif;
}
`

const CRA_INDEX_CSS = `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}
`

const craStarter: FileSystemTree = {
  'package.json': {
    file: {
      contents: CRA_PACKAGE_JSON,
    },
  },
  'yarn.lock': {
    file: {
      contents: CRA_YARN_LOCK,
    },
  },
  public: {
    directory: {
      'index.html': {
        file: {
          contents: CRA_INDEX_HTML,
        },
      },
    },
  },
  src: {
    directory: {
      'index.js': {
        file: {
          contents: CRA_INDEX_JS,
        },
      },
      'App.js': {
        file: {
          contents: CRA_APP_JS,
        },
      },
      'App.css': {
        file: {
          contents: CRA_APP_CSS,
        },
      },
      'index.css': {
        file: {
          contents: CRA_INDEX_CSS,
        },
      },
    },
  },
}

export const WORKSPACE_TEMPLATES: Record<WorkspaceTemplateId, WorkspaceTemplate> = {
  'nextjs-starter': {
    id: 'nextjs-starter',
    label: 'Next.js starter',
    description: 'Minimal Next.js App Router project with Tailwind-style styling defaults.',
    defaultPort: 3000,
    files: nextStarter,
  },
  'vite-react-starter': {
    id: 'vite-react-starter',
    label: 'Vite + React starter',
    description: 'Vite React template configured for TypeScript in WebContainers.',
    defaultPort: 5173,
    files: viteStarter,
  },
  'cra-starter': {
    id: 'cra-starter',
    label: 'Create React App starter',
    description: 'Classic CRA template booting on port 3000.',
    defaultPort: 3000,
    files: craStarter,
  },
}

export function getWorkspaceTemplateById(id?: WorkspaceTemplateId | null): WorkspaceTemplate | undefined {
  if (!id) {
    return undefined
  }

  return WORKSPACE_TEMPLATES[id]
}
