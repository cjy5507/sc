// Mock for @/db/index.js
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  // Add other methods as needed
};

// Mock the drizzle function
const drizzle = jest.fn(() => mockDb);

// Mock the database client
export const db = mockDb;

// Export the drizzle function
export { drizzle };

export default {
  db,
  drizzle,
};
