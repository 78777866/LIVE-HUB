/**
 * Shared token utilities for GitHub authentication
 */

export const GITHUB_TOKEN_KEY = 'github_oauth_token'

/**
 * Get the GitHub token from localStorage
 */
export function getGitHubToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GITHUB_TOKEN_KEY)
}

/**
 * Set the GitHub token in localStorage
 */
export function setGitHubToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GITHUB_TOKEN_KEY, token)
}

/**
 * Remove the GitHub token from localStorage
 */
export function removeGitHubToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GITHUB_TOKEN_KEY)
}

/**
 * Check if a GitHub token exists
 */
export function hasGitHubToken(): boolean {
  return getGitHubToken() !== null
}