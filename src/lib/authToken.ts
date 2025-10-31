/**
 * Centralized GitHub token storage utilities
 * Uses 'github_oauth_token' as the standard storage key
 */

const TOKEN_KEY = 'github_oauth_token'

/**
 * Get the stored GitHub token
 * @returns The token string or null if not found
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Store a GitHub token
 * @param token The token to store
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove the stored GitHub token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a token exists
 * @returns True if token exists, false otherwise
 */
export function hasToken(): boolean {
  return getToken() !== null
}