// Mock for drizzle-orm
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  // Add other drizzle-orm methods as needed
};

const pgTable = jest.fn(() => ({}));
const serial = jest.fn(() => ({}));
const text = jest.fn(() => ({}));
const varchar = jest.fn(() => ({}));
const timestamp = jest.fn(() => ({}));
const integer = jest.fn(() => ({}));
const boolean = jest.fn(() => ({}));
const pgEnum = jest.fn(() => ({}));
const relations = jest.fn(() => ({}));
const many = jest.fn(() => ({}));
const one = jest.fn(() => ({}));
const eq = jest.fn(() => ({}));

module.exports = {
  ...jest.requireActual('drizzle-orm'),
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  relations,
  many,
  one,
  eq,
  // Export the mock database instance
  db: mockDb,
};
