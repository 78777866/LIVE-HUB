'use client'

import { useCallback, useEffect } from 'react'
import { Octokit } from '@octokit/rest'
import { useAppStore } from '../state/app-store'
import { getGitHubToken, setGitHubToken, removeGitHubToken } from '../lib/token'
import { initiateDeviceCode, pollForToken } from '../lib/github-oauth-proxy'

function extractToken(authentication: unknown): string | null {
  if (typeof authentication === 'string') {
    return authentication
  }

  if (
    authentication &&
    typeof authentication === 'object' &&
    'token' in authentication &&
    typeof (authentication as { token?: unknown }).token === 'string'
  ) {
    return (authentication as { token: string }).token
  }

  return null
}

export function useGitHubAuth() {
  const session = useAppStore((state) => state.session)
  const setSession = useAppStore((state) => state.setSession)

  const setErrorState = useCallback(
    (message: string) => {
      setSession({
        status: 'error',
        loading: false,
        error: message,
        message,
        user: undefined,
        deviceCode: undefined,
        verificationUri: undefined,
      })
    },
    [setSession],
  )

  const validateAndSetUser = useCallback(
    async (token: string) => {
      try {
        setSession({
          status: 'authenticating',
          loading: true,
          error: undefined,
          message: 'Validating GitHub session...',
          deviceCode: undefined,
          verificationUri: undefined,
        })

        const octokit = new Octokit({ auth: token })
        const { data: user } = await octokit.users.getAuthenticated()

        setSession({
          status: 'authenticated',
          loading: false,
          error: undefined,
          user: {
            name: user.name || user.login,
            handle: user.login,
            avatarUrl: user.avatar_url,
          },
          message: 'Session established. Workspace is ready for repository actions.',
          deviceCode: undefined,
          verificationUri: undefined,
        })
      } catch (error) {
        console.error('Token validation error:', error)
        removeGitHubToken()
        setErrorState('Invalid token. Please sign in again.')
      }
    },
    [setErrorState, setSession],
  )

  const initiateDeviceFlow = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) {
      setErrorState('GitHub client ID not configured')
      return
    }

    try {
      setSession({
        status: 'authenticating',
        loading: true,
        error: undefined,
        message: 'Initiating GitHub device flow...',
        user: undefined,
        deviceCode: undefined,
        verificationUri: undefined,
      })

      const token = await pollForToken(
        clientId,
        ['public_repo'],
        (verification) => {
          setSession({
            status: 'authenticating',
            loading: true,
            error: undefined,
            message: 'Device flow initiated — enter the displayed code to continue.',
            deviceCode: verification.user_code,
            verificationUri: verification.verification_uri,
          })
        }
      )

      if (!token) {
        throw new Error('Device flow failed to return an access token.')
      }

      setGitHubToken(token)
      await validateAndSetUser(token)
    } catch (error) {
      console.error('Device flow error:', error)
      removeGitHubToken()
      
      // Enhanced error handling with specific OAuth error messages
      let message = 'Device flow failed'
      if (error instanceof Error) {
        message = error.message
        
        // Handle specific OAuth errors
        if (message.includes('Authorization was denied')) {
          message = 'Authorization was denied. Please try again and approve the access request.'
        }
        
        if (message.includes('device code has expired')) {
          message = 'The device code has expired. Please try again.'
        }
        
        if (message.includes('Unsupported grant type')) {
          message = 'Configuration error: Unsupported grant type. Please check your GitHub OAuth app configuration.'
        }
        
        // Detect network-related errors
        if (message.includes('Network error') ||
            message.includes('CORS') || 
            message.includes('fetch') || 
            message.includes('blocked') ||
            message.includes('Access-Control')) {
          message = 'Network error: Unable to connect to GitHub. Please check your internet connection and try again.'
        }
        
        // Detect configuration errors
        if (message.includes('client ID') || message.includes('configured')) {
          message = 'GitHub client ID not configured. Please check your environment variables.'
        }
        
        // Detect timeout errors
        if (message.includes('timed out') || message.includes('timeout')) {
          message = 'Authorization timed out. Please try again.'
        }
        
        // Don't show "authorization_pending" errors to users as they're internal
        if (message.includes('authorization_pending')) {
          message = 'Authorization is pending. Please complete the authorization in your browser.'
        }
      }
      
      setErrorState(message)
    }
  }, [setErrorState, setSession, validateAndSetUser])

  const signOut = useCallback(() => {
    removeGitHubToken()
    setSession({
      status: 'unauthenticated',
      loading: false,
      error: undefined,
      user: undefined,
      message: 'Connect your GitHub account to start exploring repositories.',
      deviceCode: undefined,
      verificationUri: undefined,
    })
  }, [setSession])

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) {
      return
    }

    const token = getGitHubToken()
    if (token) {
      validateAndSetUser(token)
    }
  }, [validateAndSetUser])

  return {
    session,
    isAuthenticated: session.status === 'authenticated',
    loading: session.loading,
    error: session.error,
    code: session.deviceCode,
    initiateDeviceFlow,
    signOut,
  }
}
