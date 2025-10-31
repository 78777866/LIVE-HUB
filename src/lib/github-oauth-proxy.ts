/**
 * GitHub OAuth Device Flow Proxy Client
 * 
 * This module handles the GitHub OAuth device flow through Next.js API routes
 * to avoid CORS issues when calling GitHub APIs directly from the browser.
 */

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface TokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

export interface Verification {
  user_code: string
  verification_uri: string
}

/**
 * Initiate the GitHub OAuth device flow
 */
export async function initiateDeviceCode(
  clientId: string,
  scopes: string[] = ['public_repo']
): Promise<DeviceCodeResponse> {
  const response = await fetch('/api/github/oauth/device-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      scopes,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return data as DeviceCodeResponse
}

/**
 * Complete the GitHub OAuth device flow and return an access token
 */
export async function pollForToken(
  clientId: string,
  scopes: string[] = ['public_repo'],
  onVerification?: (verification: Verification) => void
): Promise<string> {
  // First, get the device code info to show to the user
  const deviceCodeInfo = await initiateDeviceCode(clientId, scopes)
  
  if (onVerification) {
    onVerification({
      user_code: deviceCodeInfo.user_code,
      verification_uri: deviceCodeInfo.verification_uri,
    })
  }

  // Poll for the token
  const maxAttempts = 60 // Increased attempts for more time
  let currentInterval = Math.max(deviceCodeInfo.interval * 1000, 5000) // At least 5 seconds
  const maxInterval = 30000 // Cap at 30 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait before polling (except for the first attempt)
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, currentInterval))
    }

    try {
      const response = await fetch('/api/github/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          deviceCode: deviceCodeInfo.device_code,
        }),
      })

      // Always try to parse the response as JSON, regardless of status code
      const data = await response.json().catch(() => ({})) as TokenResponse

      // Check for successful token response
      if (data.access_token) {
        return data.access_token
      }

      // Handle GitHub's expected OAuth errors that should continue polling
      if (data.error === 'authorization_pending') {
        // Authorization is still pending, continue polling with the same interval
        continue
      }

      if (data.error === 'slow_down') {
        // GitHub is asking us to slow down, increase the interval
        currentInterval = Math.min(currentInterval * 2, maxInterval)
        continue
      }

      // Handle other OAuth errors that should terminate the flow
      if (data.error === 'access_denied') {
        throw new Error('Authorization was denied. Please try again and approve the access request.')
      }

      if (data.error === 'expired_token') {
        throw new Error('The device code has expired. Please try again.')
      }

      if (data.error === 'unsupported_grant_type') {
        throw new Error('Unsupported grant type. Please check your configuration.')
      }

      // If we have an error but it's not one of the expected OAuth errors, treat it as a failure
      if (data.error) {
        throw new Error(data.error_description || data.error)
      }

      // If we got here without a token or a recognized error, something unexpected happened
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // If response is OK but no token, wait and try again (shouldn't happen but be safe)
      continue

    } catch (error) {
      // Only rethrow errors that are not network-related
      if (error instanceof Error) {
        // Don't retry on network errors that would fail immediately again
        if (error.message.includes('fetch') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
          throw new Error('Network error: Unable to connect to GitHub. Please check your internet connection and try again.')
        }
        
        // Rethrow all other errors as they're likely OAuth errors we should handle
        throw error
      }
      
      // Unknown error type, rethrow it
      throw error
    }
  }

  throw new Error('Authorization timed out. Please try again.')
}