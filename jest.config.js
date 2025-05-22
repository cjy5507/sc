const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>'],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/src/**/*.test.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/db/(.*)$': '<rootDir>/db/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    // Handle CSS imports (without CSS modules)
    '^\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    // Handle image imports
    '^\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  // Handle module extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/', // Exclude Playwright tests
  ],
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  // Collect coverage
  collectCoverage: false,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/.next/**',
    '!**/*.d.ts',
    '!**/types/**',
    '!**/tests/**',
  ],
  // Reset mocks between tests
  resetMocks: true,
  // Clear mock calls between tests
  clearMocks: true,
  // Run tests in band (sequentially) to avoid port conflicts
  maxWorkers: 1,
  // Test timeout
  testTimeout: 30000,
  // Setup files
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
  // Add support for TypeScript paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/db/(.*)$': '<rootDir>/db/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  // Transform settings
  transformIgnorePatterns: [
    '/node_modules/(?!(drizzle-orm|drizzle-kit|@drizzle)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
