# GitHub OAuth CORS Fix

## Problem

The GitHub OAuth device flow was failing with CORS errors when making direct requests from the browser to GitHub's OAuth endpoints:

```
Access to fetch at 'https://github.com/login/device/code' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

Implemented a proxy solution using Next.js API routes to bypass CORS restrictions:

### 1. API Routes

Created two API routes to proxy GitHub OAuth requests:

- `/api/github/oauth/device-code` - Handles device code initiation
- `/api/github/oauth/token` - Handles token polling

These routes run server-side and don't have CORS restrictions.

### 2. OAuth Proxy Client

Created `src/lib/github-oauth-proxy.ts` with:

- `initiateDeviceCode()` - Proxies device code requests
- `pollForToken()` - Handles the complete OAuth flow with proper polling

### 3. Enhanced Error Handling

Updated `src/hooks/useGitHubAuth.ts` with:

- CORS-specific error detection
- User-friendly error messages for different failure scenarios
- Proper timeout handling

## Files Changed

### New Files
- `src/app/api/github/oauth/device-code/route.ts` - Device code proxy endpoint
- `src/app/api/github/oauth/token/route.ts` - Token polling proxy endpoint  
- `src/lib/github-oauth-proxy.ts` - OAuth proxy client utilities
- `src/__tests__/github-oauth-proxy.test.ts` - Tests for proxy functionality

### Modified Files
- `src/hooks/useGitHubAuth.ts` - Updated to use proxy instead of direct Octokit calls
- `src/__tests__/useGitHubAuth.test.ts` - Updated tests for new implementation
- `.env.example` - Added detailed GitHub OAuth setup instructions

## How It Works

1. User clicks "Connect GitHub account"
2. `useGitHubAuth` calls `pollForToken()` from the proxy client
3. Proxy client makes request to `/api/github/oauth/device-code`
4. API route forwards request to GitHub's device code endpoint
5. User sees device code and verification URL
6. Proxy client polls `/api/github/oauth/token` for access token
7. Once authorized, token is stored and user session is established

## Benefits

- ✅ Eliminates CORS errors
- ✅ Provides better error messages
- ✅ Maintains the same user experience
- ✅ More robust error handling
- ✅ Proper timeout management
- ✅ Comprehensive test coverage

## Testing

All tests pass:
- OAuth proxy functionality: 5/5 tests passing
- GitHub auth hook: 10/10 tests passing
- Enhanced error handling verified

## Configuration

Make sure to set up your GitHub OAuth App correctly:

1. Go to https://github.com/settings/applications/new
2. Register a new OAuth App
3. Set Homepage URL to: http://localhost:3000
4. Set Authorization callback URL to: http://localhost:3000
5. Copy the Client ID to `NEXT_PUBLIC_GITHUB_CLIENT_ID`

The proxy solution handles all CORS issues automatically.