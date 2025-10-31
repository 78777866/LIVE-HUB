# GitHub Integration for LiveHub

This document describes the current GitHub integration implementation, including authentication, repository/branch fetching, and persistence strategies.

## Authentication Implementation

### Primary Method: OAuth Device Flow (`src/hooks/useGitHubAuth.ts`)

LiveHub uses GitHub's OAuth device flow as the primary authentication method, providing a secure and user-friendly sign-in experience.

**Key Features:**
- OAuth device flow with `public_repo` scope (minimal read-only access)
- Token validation and user profile fetching
- Secure token storage in localStorage
- Complete session lifecycle management
- Error handling for auth failures and invalid tokens

**Storage Key:** `github_oauth_token`

**Usage:**
```typescript
const {
  session,
  initiateDeviceFlow,
  signOut,
} = useGitHubAuth()
```

### Secondary Method: Personal Access Tokens (`src/hooks/useAuth.ts`)

A legacy token-based authentication method is available for advanced users who prefer personal access tokens.

**Storage Key:** `github-token`

**Note:** OAuth device flow is the recommended and primary authentication method.

## Repository and Branch Data Management

### 1. Repository Fetching (`src/hooks/useRepoData.ts`)

Fetches user repositories from GitHub with pagination and basic caching.

**Key Features:**
- GitHub API integration using Octokit
- Pagination support (20 repositories per page)
- LocalStorage caching with 5-minute TTL
- Error handling for authentication, rate limits, and network errors
- Configurable sorting options (by default: updated, desc)

**Usage:**
```typescript
const {
  repositories,
  loading,
  error,
  hasMore,
  fetchNextPage,
  refetch,
  clearCache
} = useRepoData({ perPage: 20, sort: 'updated', direction: 'desc' })
```

### 2. Branch Fetching (`src/hooks/useBranches.ts`)

Fetches branches for a selected repository with caching and persistence.

**Key Features:**
- Fetches branches for given owner/repo combination
- LocalStorage caching with 2-minute TTL
- Automatic persistence of selected branch
- Error handling for access issues and missing repositories

**Usage:**
```typescript
const {
  branches,
  loading,
  error,
  selectedBranch,
  setSelectedBranch,
  refetch,
  clearCache
} = useBranches({ 
  owner: 'username', 
  repo: 'repository-name' 
})
```

### 3. Session Persistence (`src/hooks/usePersistence.ts`)

Manages persistence of user selections across sessions using a unified storage approach.

**Key Features:**
- Remembers last selected repository across sessions
- Remembers last selected branch per repository
- Automatic restoration on app load
- Unified localStorage key patterns
- Cleanup functionality for orphaned data

**Storage Keys:**
- Last Repository: `livehub-last-selected-repo`
- Last Branch: `livehub-last-selected-branch-{owner}-{repo}`

## UI Components

### SessionPanel (`src/components/panels/SessionPanel.tsx`)

Primary authentication interface using OAuth device flow:

**Features:**
- OAuth device flow initiation and code display
- User profile display with avatar when authenticated
- Sign out functionality
- Error handling and retry options
- Clean, responsive design

### RepositoryPanel (`src/components/panels/RepositoryPanel.tsx`)

Repository browsing and WebContainer management interface:

**Features:**
- Real repository listing from GitHub API
- Branch selector for selected repository
- WebContainer launch controls
- Loading and error states with retry functionality
- Pagination support for large repository lists

## Storage and Caching Strategy

### Authentication Storage
- **OAuth Token:** `github_oauth_token` (primary method)
- **Personal Access Token:** `github-token` (legacy method)

### Repository Cache
- **Key:** `github-repos-cache`
- **TTL:** 5 minutes
- **Structure:** `{ data: RepositorySummary[], timestamp: number }`

### Branch Cache
- **Key:** `github-branches-{owner}-{repo}`
- **TTL:** 2 minutes
- **Structure:** `{ data: Branch[], timestamp: number }`

### Persistence Storage
- **Last Repository:** `livehub-last-selected-repo`
- **Last Branch:** `livehub-last-selected-branch-{owner}-{repo}`

### Note on Caching
Current implementation uses basic TTL-based caching. ETag-based conditional requests are planned for future enhancements to improve API efficiency.

## Error Handling

### Authentication Errors (401)
- Clear messaging about invalid/expired tokens
- Automatic token cleanup for invalid credentials
- Prompt to re-authenticate via device flow

### Rate Limit Errors (403)
- Informative messages about API rate limits
- Suggestions for waiting before retry
- Rate limit awareness in UI

### Network Errors
- User-friendly error messages
- Retry functionality throughout the interface
- Graceful degradation when offline

### Repository Not Found (404)
- Clear messaging about access permissions
- Suggestions for checking repository visibility
- Links to GitHub for verification

## Usage Flow

1. **Authentication:** User initiates OAuth device flow in SessionPanel
2. **Device Code:** User enters code on GitHub to authorize
3. **Repository Loading:** useRepoData automatically fetches and caches repositories
4. **Repository Selection:** User selects repository, persistence saves selection
5. **Branch Loading:** useBranches fetches branches for selected repository
6. **Branch Selection:** User selects branch, persistence saves selection
7. **Workspace Launch:** Selected repository and branch used for WebContainer boot

## Security Notes

- **OAuth Device Flow:** Recommended method with minimal `public_repo` scope
- **Token Storage:** Client-side localStorage only (no server storage)
- **Scope Limitation:** Uses minimal read-only access to repositories
- **Token Validation:** Automatic validation and cleanup of invalid tokens

## Performance Considerations

### Current Optimizations
- **LocalStorage Caching:** Reduces GitHub API calls for frequently accessed data
- **Pagination:** Prevents loading large repository datasets at once (20 per page)
- **Branch-level Caching:** Quick switching between recently accessed branches
- **Automatic Cleanup:** Cache entries expire automatically based on TTL

### Future Enhancements
- **ETag Support:** Conditional requests to avoid unnecessary data transfer
- **Background Sync:** Service worker for offline functionality
- **Virtual Scrolling:** Efficient handling of large repository lists
- **Web Workers:** Background processing for data operations

## Configuration Requirements

### Environment Variables
```bash
# Required for OAuth Device Flow
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

### GitHub OAuth App Configuration
- **Application Type:** OAuth App
- **Callback URL:** Not required for device flow
- **Scopes:** `public_repo` (minimal read-only access)
- **Device Flow:** Must be enabled in GitHub OAuth app settings

## Testing

Current test coverage focuses on core functionality:

- **Authentication Flow:** Device flow initiation and token handling
- **Repository Data:** API integration, caching, and pagination
- **Branch Management:** Fetching, caching, and persistence
- **Error Scenarios:** Network failures, rate limits, and invalid data

Note: Test suite is evolving with the implementation. Comprehensive unit and integration tests are planned for future releases.