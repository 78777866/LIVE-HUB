import { getToken, setToken, clearToken, hasToken } from '@/lib/authToken'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock window object
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('authToken utilities', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('getToken', () => {
    it('should return null when window is undefined', () => {
      const originalWindow = global.window
      // @ts-ignore - Temporarily remove window
      delete global.window

      const result = getToken()
      expect(result).toBeNull()

      global.window = originalWindow
    })

    it('should return null when token is not stored', () => {
      const result = getToken()
      expect(result).toBeNull()
    })

    it('should return the stored token', () => {
      localStorageMock.setItem('github_oauth_token', 'test-token')
      const result = getToken()
      expect(result).toBe('test-token')
    })

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem
      localStorageMock.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })

      const result = getToken()
      expect(result).toBeNull()

      localStorageMock.getItem = originalGetItem
    })
  })

  describe('setToken', () => {
    it('should not throw when window is undefined', () => {
      const originalWindow = global.window
      // @ts-ignore - Temporarily remove window
      delete global.window

      expect(() => setToken('test-token')).not.toThrow()

      global.window = originalWindow
    })

    it('should store the token in localStorage', () => {
      setToken('test-token')
      expect(localStorageMock.getItem('github_oauth_token')).toBe('test-token')
    })

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorageMock.setItem
      localStorageMock.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => setToken('test-token')).not.toThrow()

      localStorageMock.setItem = originalSetItem
    })
  })

  describe('clearToken', () => {
    it('should not throw when window is undefined', () => {
      const originalWindow = global.window
      // @ts-ignore - Temporarily remove window
      delete global.window

      expect(() => clearToken()).not.toThrow()

      global.window = originalWindow
    })

    it('should remove the token from localStorage', () => {
      localStorageMock.setItem('github_oauth_token', 'test-token')
      clearToken()
      expect(localStorageMock.getItem('github_oauth_token')).toBeNull()
    })

    it('should handle localStorage errors gracefully', () => {
      const originalRemoveItem = localStorageMock.removeItem
      localStorageMock.removeItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => clearToken()).not.toThrow()

      localStorageMock.removeItem = originalRemoveItem
    })
  })

  describe('hasToken', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-ignore - Temporarily remove window
      delete global.window

      const result = hasToken()
      expect(result).toBe(false)

      global.window = originalWindow
    })

    it('should return false when token is not stored', () => {
      const result = hasToken()
      expect(result).toBe(false)
    })

    it('should return true when token is stored', () => {
      localStorageMock.setItem('github_oauth_token', 'test-token')
      const result = hasToken()
      expect(result).toBe(true)
    })

    it('should return false when token is empty string', () => {
      localStorageMock.setItem('github_oauth_token', '')
      const result = hasToken()
      expect(result).toBe(false)
    })
  })

  describe('integration', () => {
    it('should work together: set -> get -> has -> clear', () => {
      // Initially no token
      expect(getToken()).toBeNull()
      expect(hasToken()).toBe(false)

      // Set token
      setToken('integration-test-token')
      expect(getToken()).toBe('integration-test-token')
      expect(hasToken()).toBe(true)

      // Clear token
      clearToken()
      expect(getToken()).toBeNull()
      expect(hasToken()).toBe(false)
    })
  })
})