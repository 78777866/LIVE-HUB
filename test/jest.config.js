const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  rootDir: '../',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load Next.js config which is async
module.exports = createJestConfig(customJestConfig)