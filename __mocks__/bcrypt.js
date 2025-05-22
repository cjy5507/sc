// Simple mock for bcrypt
const bcrypt = {
  hash: jest.fn().mockImplementation((data, saltOrRounds) => {
    return Promise.resolve('hashed-password');
  }),
  compare: jest.fn().mockImplementation((data, encrypted) => {
    return Promise.resolve(true);
  }),
  genSalt: jest.fn().mockImplementation((rounds) => {
    return Promise.resolve('mocked-salt');
  })
};

module.exports = bcrypt;
