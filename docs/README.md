# LiveHub Scaffold

Client-first workspace shell that integrates GitHub authentication and StackBlitz WebContainers. 
The workspace provides end-to-end GitHub integration: authenticate via OAuth device flow, browse 
your repositories, select branches, and launch projects in isolated WebContainer environments. 
Panels surface repository controls, file explorer, live console streaming, and preview iframe 
updates with real GitHub data and persistent session state.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (client components only)
- **State management:** Zustand
- **Styling:** Tailwind CSS
- **Tooling:** ESLint + Prettier + Jest
- **Runtime target:** StackBlitz WebContainers (COOP/COEP headers + Bundler module resolution)

## Getting started

```bash
npm install
npm run dev
# or, with pnpm
pnpm install
pnpm dev
```

The development server boots on [http://localhost:3000](http://localhost:3000) and renders the full
workspace shell with functional panels for GitHub authentication, repository selection, file explorer,
Monaco editor surface, console stream, and preview iframe.

### Available scripts

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Next.js development server          |
| `npm run build`   | Build the production bundle                   |
| `npm run start`   | Run the production server                     |
| `npm run lint`    | Execute ESLint with the Next.js config        |
| `npm run test`    | Run Jest test suite                           |
| `npm run type-check` | Perform TypeScript type checking          |
| `npm run format`  | Format files with Prettier                    |
| `npm run ci:lint` | CI helper alias for linting                   |
| `npm run ci:test` | CI helper alias for testing                   |
| `npm run ci:type-check` | CI helper alias for type checking      |

## Project structure

```
src/
├── app/
│   ├── layout.tsx             # Root layout loading global styles
│   ├── page.tsx               # Workspace shell with responsive panes
│   └── globals.css            # Tailwind base styles
├── components/
│   ├── layout/AppShellProviders.tsx
│   ├── panels/                # Interactive panels wired to WebContainer lifecycle
│   └── ui/LoadingPulse.tsx
├── lib/
│   ├── utils.ts               # Utility helpers (class name merger)
│   ├── workspace.ts           # Package manager & dev-command inference helpers
│   ├── workspace-templates.ts # Sample project file systems for local bootstrapping
│   └── webcontainer-client.ts # WebContainer boot/install/dev-server orchestration
└── state/app-store.ts         # Zustand store scaffolding and runtime state
```

## Acceptance notes

- No API routes or server components are present—interactive UI is handled entirely on the client.
- TypeScript compiler uses bundler module resolution to satisfy WebContainers requirements.
- GitHub authentication uses OAuth device flow with token persistence in localStorage.
- Repository and branch data are fetched from GitHub API with caching and pagination support.
- Repository, console, and preview panels drive a full WebContainer lifecycle: boot after user
  gesture, mount repository file systems, detect package manager/dev script, stream install output,
  and surface the live preview when the dev server reports ready.
- Last selected repository and branch are persisted across sessions.

## Current Capabilities

✅ **Implemented Features:**
- GitHub OAuth device flow authentication
- Repository browsing with search and pagination
- Branch selection per repository
- WebContainer project launch and management
- Live console streaming and preview
- Session and selection persistence
- Template-based workspace bootstrapping

🚧 **Future Enhancements:**
- Monaco editor integration with file editing
- Advanced caching strategies (ETag support)
- Repository analytics and insights
- Collaboration features
- Enhanced error recovery and observability
