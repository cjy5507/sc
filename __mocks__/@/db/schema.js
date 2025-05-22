// Mock for @/db/schema
const pgTable = jest.fn(() => ({}));
const serial = jest.fn(() => ({}));
const text = jest.fn(() => ({}));
const varchar = jest.fn(() => ({}));
const timestamp = jest.fn(() => ({}));
const integer = jest.fn(() => ({}));
const boolean = jest.fn(() => ({}));
const pgEnum = jest.fn(() => ({}));

// Mock users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  carrier: varchar('carrier', { length: 20 }),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Mock other tables as needed
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  address: text('address').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  description: text('description'),
  reservationUrl: text('reservation_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const watchModels = pgTable('watch_models', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  reference: varchar('reference', { length: 50 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Mock relations
export const relations = {
  many: jest.fn(() => ({})),
  one: jest.fn(() => ({})),
};

// Mock eq for where clauses
export const eq = jest.fn(() => ({}));

// Mock other exports as needed
export default {
  users,
  stores,
  watchModels,
  relations,
  eq,
};
