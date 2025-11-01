// Optional: configure or set up a testing framework before each test.
// If you're using Jest, this is where you'd set up globals, mocks, etc.

require('@testing-library/jest-dom')

// Mock Web APIs that might not be available in Jest environment
Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(),
})

// Mock TextDecoder/TextEncoder if needed
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder
}
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})