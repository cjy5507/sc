// Simple mock for jsonwebtoken
const jwt = {
  sign: jest.fn().mockImplementation((payload, secret, options) => {
    return 'mocked-jwt-token';
  }),
  verify: jest.fn().mockImplementation((token, secret, options) => {
    return {
      userId: 1,
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
    };
  }),
  decode: jest.fn().mockImplementation((token, options) => {
    return {
      userId: 1,
      email: 'test@example.com',
    };
  })
};

module.exports = jwt;
