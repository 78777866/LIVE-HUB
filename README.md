# LiveHub

Client-first workspace shell that integrates GitHub authentication and StackBlitz WebContainers. 
The workspace provides end-to-end GitHub integration: authenticate via OAuth device flow, browse 
your repositories, select branches, and launch projects in isolated WebContainer environments. 
Panels surface repository controls, file explorer, Monaco editor, live console streaming, and preview 
iframe updates with real GitHub data and persistent session state.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (client components only)
- **State management:** Zustand
- **Styling:** Tailwind CSS
- **Editor:** Monaco Editor
- **Tooling:** ESLint + Prettier + Jest
- **Runtime target:** StackBlitz WebContainers (COOP/COEP headers + Bundler module resolution)
- **GitHub Integration:** Octokit with OAuth device flow

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
Monaco editor with live editing, console stream, and preview iframe.

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

### Development workflow

1. **Setup**: Install dependencies with `npm install` or `pnpm install`
2. **Development**: Run `npm run dev` to start the development server
3. **Testing**: Use `npm run test` for unit tests, `npm run ci:test` for CI testing
4. **Linting**: Run `npm run lint` to check code quality
5. **Type checking**: Use `npm run type-check` to verify TypeScript types
6. **Formatting**: Run `npm run format` to format code with Prettier

### Testing strategy

- **Unit tests**: Individual utility functions and hooks
- **Component tests**: React components with mocked dependencies  
- **Integration tests**: End-to-end workflows with WebContainer mocking
- **Coverage**: Comprehensive test coverage for all core functionality

## Project structure

```
src/
├── app/
│   ├── layout.tsx             # Root layout loading global styles
│   ├── page.tsx               # Main workspace shell with responsive panes
│   ├── head.tsx               # Document head configuration
│   ├── globals.css            # Tailwind base styles
│   └── api/
│       └── github/
│           └── oauth/         # GitHub OAuth proxy endpoints
├── components/
│   ├── layout/
│   │   ├── AppShellProviders.tsx  # Global providers wrapper
│   │   └── Sidebar.tsx            # Main navigation sidebar
│   ├── panels/                # Interactive panels wired to WebContainer lifecycle
│   │   ├── EditorPanel.tsx        # Monaco editor with file editing
│   │   ├── ConsolePanel.tsx       # Live console output streaming
│   │   ├── PreviewPanel.tsx       # Live preview iframe
│   │   ├── FileTreePanel.tsx      # Repository file explorer
│   │   ├── RepositoryPanel.tsx     # GitHub repository browser
│   │   ├── SessionPanel.tsx       # Authentication session manager
│   │   └── PanelShell.tsx         # Reusable panel wrapper
│   └── ui/
│       └── LoadingPulse.tsx    # Loading animation component
├── hooks/
│   ├── useAuth.ts             # Authentication state management
│   ├── useGitHubAuth.ts       # GitHub OAuth device flow
│   ├── useRepoData.ts         # Repository data fetching & pagination
│   ├── useBranches.ts         # Branch data management
│   └── usePersistence.ts      # Session persistence utilities
├── lib/
│   ├── utils.ts               # Utility helpers (class name merger)
│   ├── authToken.ts           # Token management utilities
│   ├── token.ts               # Token storage helpers
│   ├── github-oauth-proxy.ts  # GitHub OAuth proxy client
│   ├── github-sync.ts         # GitHub data synchronization
│   ├── file-system.ts         # File system operations
│   ├── workspace.ts           # Package manager & dev-command inference
│   ├── workspace-templates.ts # Sample project file systems
│   ├── workspace-detector.ts  # Project type detection
│   └── webcontainer-client.ts # WebContainer orchestration
├── state/
│   └── app-store.ts           # Zustand store with full application state
└── __tests__/                 # Comprehensive test suite
    ├── integration.test.ts    # End-to-end integration tests
    ├── *.test.ts              # Unit tests for utilities and hooks
    └── *.test.tsx             # Component tests
```

## Acceptance notes

- Minimal API routes exist only for GitHub OAuth proxy—interactive UI is handled primarily on the client.
- TypeScript compiler uses bundler module resolution to satisfy WebContainers requirements.
- GitHub authentication uses OAuth device flow with token persistence in localStorage.
- Repository and branch data are fetched from GitHub API with caching and pagination support.
- Repository, editor, console, and preview panels drive a full WebContainer lifecycle: boot after user
  gesture, mount repository file systems, detect package manager/dev script, stream install output,
  and surface the live preview when the dev server reports ready.
- Monaco editor provides live file editing with syntax highlighting and IntelliSense.
- Last selected repository and branch are persisted across sessions.
- Comprehensive test suite covers unit tests, integration tests, and component testing.

## Configuration

Key configuration files that enable the LiveHub functionality:

- **next.config.js**: WebContainers COOP/COEP headers and GitHub avatar domains
- **tailwind.config.ts**: Tailwind CSS configuration with custom theme
- **jest.config.js**: Jest testing setup with jsdom environment
- **postcss.config.js**: PostCSS configuration for Tailwind processing

### WebContainers requirements

The application requires specific HTTP headers for WebContainers to function:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

These are automatically configured in `next.config.js` for all routes.

## Architecture

LiveHub follows a client-first architecture with these key patterns:

- **State management**: Centralized Zustand store with typed selectors and actions
- **Component composition**: Reusable panel shells with consistent UI patterns
- **Hook abstraction**: Custom hooks encapsulate complex logic (auth, GitHub API, WebContainer)
- **Error boundaries**: Graceful error handling with user-friendly fallbacks
- **Performance**: Lazy loading, optimistic updates, and efficient re-renders
- **Type safety**: Full TypeScript coverage with strict configuration

### Key patterns

- **Panel system**: Consistent layout with resizable, collapsible panels
- **File management**: Virtual file system with change tracking and persistence
- **Streaming**: Real-time console output and preview updates
- **Authentication**: OAuth device flow with automatic token refresh
- **Caching**: Intelligent GitHub API caching with pagination support

## Current Capabilities

✅ **Implemented Features:**
- GitHub OAuth device flow authentication with proxy endpoints
- Repository browsing with search, filtering, and pagination
- Branch selection per repository with caching
- WebContainer project launch and management
- Monaco editor integration with live file editing
- Live console streaming with real-time output
- Preview iframe with hot-reload support
- File explorer with tree navigation
- Session and selection persistence
- Template-based workspace bootstrapping
- Package manager auto-detection (npm, yarn, pnpm, bun)
- Dev command inference and execution
- Comprehensive error handling and recovery
- Full test coverage (unit, integration, component tests)

🚧 **Future Enhancements:**
- Advanced caching strategies (ETag support)
- Repository analytics and insights
- Collaboration features (multi-user editing)
- Enhanced error recovery and observability
- File upload/download capabilities
- Custom workspace templates
- Terminal emulation within WebContainer
- Git operations (commit, push, pull)
- Environment variable management
