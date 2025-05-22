// Optional: configure or set up a testing framework before each test.
// This file is run once for the entire test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Add any global test setup here
module.exports = async () => {
  // Global setup code if needed
  console.log('Global test setup complete');
};
