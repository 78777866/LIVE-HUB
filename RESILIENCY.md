# Resiliency Layer Implementation

This document describes the comprehensive resiliency layer implemented for LiveHub to handle errors gracefully, provide user-friendly feedback, and ensure robust operation under various failure conditions.

## Overview

The resiliency layer provides:

- **Global Error Boundaries**: Catch React errors and display user-friendly messages
- **Toast Notifications**: Surface recoverable errors without blank screens
- **Browser Capability Checks**: Detect WebContainer compatibility with guidance
- **Retry/Backoff Strategies**: Intelligent retry with exponential backoff for API calls
- **Timeout Management**: Configurable timeouts with cancellation hooks
- **Error Logging**: Sanitized logging with telemetry stub for future integration

## Architecture

### Core Components

#### `/src/lib/resiliency/`
- **`types.ts`**: Type definitions for errors, retries, timeouts, and browser compatibility
- **`error-factory.ts`**: Standardized error creation with user-friendly messages
- **`retry.ts`**: Exponential backoff retry mechanism with jitter
- **`timeout.ts`**: Timeout management with cancellation support
- **`logger.ts`**: Error logging with sanitization and telemetry
- **`browser-compatibility.ts`**: WebContainer capability detection
- **`index.ts`**: Main exports

#### `/src/components/ui/`
- **`Toast.tsx`**: Toast notification system with retry actions
- **`ErrorBoundary.tsx`**: React error boundary with fallback UI
- **`BrowserCompatibility.tsx`**: Browser compatibility alerts and full-page warnings
- **`ResiliencyUI.tsx`**: Retry buttons, progress indicators, timeout warnings

#### `/src/hooks/`
- **`useResiliency.ts`**: Main resiliency hook with API and WebContainer variants

## Features

### 1. Error Handling

#### Error Types
```typescript
enum ErrorType {
  AUTHENTICATION = 'authentication',
  API_RATE_LIMIT = 'api_rate_limit',
  NETWORK = 'network',
  WEBCONTAINER_UNSUPPORTED = 'webcontainer_unsupported',
  TIMEOUT = 'timeout',
  DOWNLOAD_FAILED = 'download_failed',
  INSTALL_FAILED = 'install_failed',
  BUILD_FAILED = 'build_failed',
  RUNTIME_ERROR = 'runtime_error',
  BROWSER_INCOMPATIBLE = 'browser_incompatible',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}
```

#### Error Factory
Creates standardized errors with:
- Unique IDs
- Type and severity classification
- User-friendly messages
- Suggested actions
- Context information
- Retry capability flags

```typescript
const error = ErrorFactory.network(
  'Connection failed',
  originalError,
  { url: 'https://api.github.com' }
)
```

### 2. Retry Mechanism

#### Exponential Backoff with Jitter
- Configurable retry attempts (default: 3)
- Exponential delay with configurable factor (default: 2x)
- Jitter to prevent thundering herd (default: enabled)
- Maximum delay limits (default: 10s)

#### Predefined Configurations
```typescript
export const RETRY_CONFIGS = {
  GITHUB_API: { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000 },
  TARBALL_DOWNLOAD: { maxAttempts: 2, baseDelay: 2000, maxDelay: 15000 },
  WEBCONTAINER_BOOT: { maxAttempts: 2, baseDelay: 1000, maxDelay: 5000 }
}
```

#### Usage
```typescript
const result = await RetryManager.executeWithRetry(
  () => apiCall(),
  RETRY_CONFIGS.GITHUB_API,
  'api_rate_limit',
  { operation: 'fetchRepositories' }
)
```

### 3. Timeout Management

#### Configurable Timeouts
- GitHub API: 30 seconds
- Tarball download: 2 minutes
- WebContainer install: 5 minutes
- WebContainer build: 3 minutes
- WebContainer boot: 1 minute

#### Progress Tracking
- Real-time progress updates
- Time remaining estimates
- Cancellation support
- Extension capabilities

```typescript
const result = await TimeoutManager.executeWithTimeout(
  (signal) => longRunningOperation(signal),
  { duration: 30000, onTimeout: () => console.log('Timed out') }
)
```

### 4. Browser Compatibility

#### Detection Features
- SharedArrayBuffer support
- Cross-Origin Isolation (COOP/COEP)
- Required API availability (Fetch, AbortController, ReadableStream)
- HTTPS requirement in production
- Browser version checks (Chrome 92+, Edge 92+, Firefox 100+)

#### Compatibility Report
```typescript
const report = browserCompatibility.getCompatibilityReport()
// Returns: { isCompatible, summary, details, canProceed }
```

#### Browser Information
```typescript
const info = browserCompatibility.getBrowserInfo()
// Returns: { name, version, userAgent }
```

### 5. Error Logging

#### Sanitized Logging
- Automatic sensitive data redaction
- Structured log entries with timestamps
- Session tracking
- User association
- Performance metrics

#### Log Levels
- Debug, Info, Warning, Error
- Contextual source information
- Metadata preservation

```typescript
errorLogger.logError(appError, 'component-name')
errorLogger.logPerformance('operation', duration, success, metadata)
errorLogger.logUserAction('click', { element: 'button' })
```

### 6. UI Components

#### Toast Notifications
- Auto-dismiss with configurable duration
- Persistent for critical errors
- Retry actions for recoverable errors
- Stacking with proper z-index
- Accessibility support

#### Error Boundaries
- Catch React render errors
- Development details in dev mode
- Error ID tracking
- Recovery options

#### Progress Indicators
- Visual progress bars
- Time remaining estimates
- Cancellation support
- Responsive design

#### Retry Buttons
- Visual retry state
- Attempt counting
- Disabled when max attempts reached
- Loading states

## Integration

### GitHub API Integration

All GitHub API functions now include:
- Automatic retry with backoff
- Timeout protection
- Error wrapping with user messages
- Context preservation

```typescript
export const getUserRepositories = withRetry(
  async (token, options) => { /* implementation */ },
  RETRY_CONFIGS.GITHUB_API,
  'api_rate_limit',
  (token, options) => ({ operation: 'getUserRepositories', page: options?.page })
)
```

### WebContainer Integration

WebContainer operations include:
- Browser compatibility checks before boot
- Timeout protection for all phases
- Error categorization
- Progress tracking

```typescript
private async initializeContainer(): Promise<void> {
  const compatibility = browserCompatibility.checkWebContainerCompatibility()
  if (!compatibility.supported) {
    throw ErrorFactory.webContainerUnsupported(
      'Browser does not support WebContainer',
      compatibility.missingFeatures
    )
  }
  
  this.container = await createWebContainerTimeout(
    WebContainerAPI.boot(),
    TIMEOUT_CONFIGS.WEBCONTAINER_BOOT,
    'WebContainer Boot'
  )
}
```

## Usage Examples

### Basic Resiliency Hook
```typescript
const {
  isRetrying,
  retryCount,
  lastError,
  executeWithResiliency
} = useResiliency()

const result = await executeWithResiliency(
  () => apiCall(),
  {
    errorType: 'network',
    retryConfig: { maxAttempts: 3 },
    timeoutConfig: { duration: 30000 }
  }
)
```

### API-Specific Hook
```typescript
const { executeApiCall } = useApiResiliency()

const repos = await executeApiCall(
  () => getUserRepositories(token),
  { operation: 'fetchRepositories' }
)
```

### WebContainer-Specific Hook
```typescript
const { executeWebContainerOperation } = useWebContainerResiliency()

await executeWebContainerOperation(
  () => startContainer(owner, repo, branch),
  'run',
  { owner, repo, branch }
)
```

## Testing

### Test Suite
Run comprehensive tests:
```bash
npm run test:resiliency
```

### Demo Page
Visit `/resiliency-demo` for interactive demonstrations of:
- Retry mechanisms
- Timeout handling
- Browser compatibility
- Error recovery
- Progress tracking

## Configuration

### Environment Variables
```env
# Enable/disable telemetry
NEXT_PUBLIC_TELEMETRY_ENABLED=true

# Log level
NEXT_PUBLIC_LOG_LEVEL=info

# Browser compatibility enforcement
NEXT_PUBLIC_STRICT_BROWSER_CHECK=false
```

### Custom Configuration
```typescript
// Override default retry config
const customRetryConfig = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 20000,
  backoffFactor: 1.5,
  jitter: true
}

// Override default timeout config
const customTimeoutConfig = {
  duration: 60000,
  onTimeout: () => console.warn('Operation timed out')
}
```

## Acceptance Criteria

✅ **Simulated API errors display user-friendly alerts and allow retries without reloading**

- Toast notifications with clear error messages
- Retry buttons with attempt counting
- No page reloads required

✅ **Unsupported browser scenarios display dedicated compatibility message**

- Browser compatibility checks on app load
- Clear recommendations for unsupported features
- Full-page compatibility warning for severe issues

✅ **Long-running steps time out after configured thresholds**

- Configurable timeouts for different operation types
- Progress tracking with time remaining
- Cancellation hooks for user control

✅ **No unhandled promise rejections during normal failure simulations**

- Global error handlers for unhandled rejections
- Comprehensive error boundary coverage
- Proper error logging and user feedback

## Future Enhancements

1. **Telemetry Integration**: Connect to real analytics service
2. **Offline Support**: Cache and retry when connection restored
3. **Circuit Breaker**: Prevent cascading failures
4. **Health Checks**: Proactive system health monitoring
5. **User Preferences**: Customizable retry behavior