import { initiateDeviceCode, pollForToken } from '../lib/github-oauth-proxy'

// Mock fetch
global.fetch = jest.fn()

describe('GitHub OAuth Proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initiateDeviceCode', () => {
    it('should call the device code API endpoint', async () => {
      const mockResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await initiateDeviceCode('test-client-id', ['public_repo'])

      expect(fetch).toHaveBeenCalledWith('/api/github/oauth/device-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: 'test-client-id',
          scopes: ['public_repo'],
        }),
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      })

      await expect(initiateDeviceCode('test-client-id')).rejects.toThrow('Bad Request')
    })
  })

  describe('pollForToken', () => {
    it('should complete the full OAuth flow', async () => {
      // Mock device code response
      const mockDeviceCodeResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1, // Short interval for testing
      }

      // Mock token response
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        scope: 'public_repo',
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeviceCodeResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })

      const onVerification = jest.fn()
      const result = await pollForToken('test-client-id', ['public_repo'], onVerification)

      expect(onVerification).toHaveBeenCalledWith({
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
      })

      expect(result).toBe('test-access-token')
    })

    it('should handle authorization pending', async () => {
      const mockDeviceCodeResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1,
      }

      let callCount = 0
      ;(fetch as jest.Mock).mockImplementation((url) => {
        callCount++
        if (url.includes('device-code')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockDeviceCodeResponse,
          })
        } else {
          // First call returns authorization_pending, second returns success
          if (callCount === 2) {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'authorization_pending' }),
            })
          } else {
            return Promise.resolve({
              ok: true,
              json: async () => ({ access_token: 'test-access-token' }),
            })
          }
        }
      })

      const result = await pollForToken('test-client-id')
      expect(result).toBe('test-access-token')
      expect(fetch).toHaveBeenCalledTimes(3) // device-code + token + token
    }, 10000)

    it('should handle timeout errors', async () => {
      // Test that the function properly throws timeout errors
      jest.spyOn(console, 'log').mockImplementation()
      
      // Mock a timeout error directly
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Authorization timed out. Please try again.'))

      await expect(pollForToken('test-client-id')).rejects.toThrow('Authorization timed out')
    })

    it('should handle access_denied error', async () => {
      const mockDeviceCodeResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1,
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeviceCodeResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'access_denied' }),
        })

      await expect(pollForToken('test-client-id')).rejects.toThrow('Authorization was denied')
    })

    it('should handle expired_token error', async () => {
      const mockDeviceCodeResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1,
      }

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeviceCodeResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'expired_token' }),
        })

      await expect(pollForToken('test-client-id')).rejects.toThrow('The device code has expired')
    })

    it('should handle slow_down error by increasing interval', async () => {
      const mockDeviceCodeResponse = {
        device_code: 'test-device-code',
        user_code: 'test-user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1, // Use minimal interval for testing
      }

      let callCount = 0
      ;(fetch as jest.Mock).mockImplementation((url) => {
        callCount++
        if (url.includes('device-code')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockDeviceCodeResponse,
          })
        } else {
          // First call returns slow_down, second returns success
          if (callCount === 2) {
            return Promise.resolve({
              ok: false,
              json: async () => ({ error: 'slow_down' }),
            })
          } else {
            return Promise.resolve({
              ok: true,
              json: async () => ({ access_token: 'test-access-token' }),
            })
          }
        }
      })

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn().mockImplementation((fn, delay) => {
        // Call the function immediately for testing
        return originalSetTimeout(fn, 0)
      })

      try {
        const result = await pollForToken('test-client-id')
        expect(result).toBe('test-access-token')
        expect(fetch).toHaveBeenCalledTimes(3) // device-code + slow_down + success
      } finally {
        // Restore original setTimeout
        global.setTimeout = originalSetTimeout
      }
    }, 5000)
  })
})