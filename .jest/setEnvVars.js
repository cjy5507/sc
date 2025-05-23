// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

// Mock process.env
jest.mock('next/config', () => () => ({
  publicRuntimeConfig: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
  },
}));
