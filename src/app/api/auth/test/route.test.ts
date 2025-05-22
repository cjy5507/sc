import { NextRequest } from 'next/server';
import { POST as authHandler } from '../route';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Type definitions for our mocks
type Mocked<T> = { -readonly [P in keyof T]: T[P] } & {
  mockResolvedValue: (value: any) => jest.Mock;
  mockResolvedValueOnce: (value: any) => jest.Mock;
  mockRejectedValue: (value: any) => jest.Mock;
  mockRejectedValueOnce: (value: any) => jest.Mock;
  mockReturnValue: (value: any) => jest.Mock;
  mockReturnValueOnce: (value: any) => jest.Mock;
  mockImplementation: (fn: any) => jest.Mock;
  mockImplementationOnce: (fn: any) => jest.Mock;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
};

// Extend the jest.Mock type to include our custom properties
interface MockedFunction<T extends (...args: any[]) => any> extends jest.Mock {
  (...args: Parameters<T>): ReturnType<T>;
  mockResolvedValue: (value: any) => jest.Mock;
  mockResolvedValueOnce: (value: any) => jest.Mock;
  mockRejectedValue: (value: any) => jest.Mock;
  mockRejectedValueOnce: (value: any) => jest.Mock;
  mockReturnValue: (value: any) => jest.Mock;
  mockReturnValueOnce: (value: any) => jest.Mock;
  mockImplementation: (fn: any) => jest.Mock;
  mockImplementationOnce: (fn: any) => jest.Mock;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
}

// Mock types for our database client
type MockDbClient = {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  insert: jest.Mock;
  values: jest.Mock;
  returning: jest.Mock;
  delete: jest.Mock;
  execute: jest.Mock;
};

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
} as unknown as typeof bcrypt;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
} as unknown as typeof jwt;

// Mock the database
const mockDbClient: MockDbClient = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  delete: jest.fn().mockResolvedValue(undefined),
  execute: jest.fn().mockResolvedValue({ rows: [] }),
};

jest.mock('@/db', () => ({
  __esModule: true,
  ...jest.requireActual('@/db'),
  db: mockDbClient,
}));

// Helper function to create test requests
const createTestRequest = (body: any) => {
  return new NextRequest('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
};

describe('Auth API', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockedBcrypt.compare as jest.Mock).mockImplementation((input: string) => 
      Promise.resolve(input === 'test1234')
    );
    
    (mockedJwt.sign as jest.Mock).mockReturnValue('mocked-jwt-token');
    
    // Reset database mocks
    mockDbClient.select.mockReturnThis();
    mockDbClient.from.mockReturnThis();
    mockDbClient.where.mockReturnThis();
    mockDbClient.insert.mockReturnThis();
    mockDbClient.values.mockReturnThis();
    mockDbClient.returning.mockResolvedValue([{ id: 1 }]);
    mockDbClient.delete.mockResolvedValue(undefined);
    mockDbClient.execute.mockResolvedValue({ rows: [] });
  });

  describe('POST /api/auth', () => {
    it('should register and login a new user', async () => {
      const testUser = {
        carrier: 'SKT',
        email: 'test@example.com',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      };

      // Register request
      const request = createTestRequest(testUser);
      const response = await authHandler(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.carrier).toBe(testUser.carrier);
      
      // Verify user creation was attempted
      expect(mockDbClient.insert).toHaveBeenCalledWith(users);
      expect(mockDbClient.values).toHaveBeenCalledWith({
        email: testUser.email,
        name: testUser.email.split('@')[0],
        phoneNumber: '',
        carrier: testUser.carrier,
        password: 'hashed-password',
        clerkId: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should login an existing user', async () => {
      // Create test user
      const testUser = {
        email: 'existing@example.com',
        name: 'Existing User',
        carrier: 'KT',
        password: '$2b$10$examplehashedpassword', // bcrypt hash of 'test1234'
      };

      await db.insert(users).values(testUser);

      // Login request
      const request = createTestRequest({
        carrier: 'KT',
        email: 'existing@example.com',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      });

      const response = await authHandler(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
    });

    it('should reject login with wrong password', async () => {
      // Create test user
      const testUser = {
        email: 'existing@example.com',
        name: 'Existing User',
        carrier: 'LG U+',
        password: '$2b$10$examplehashedpassword', // bcrypt hash of 'test1234'
      };

      await db.insert(users).values(testUser);

      // Attempt login with wrong password
      const request = createTestRequest({
        carrier: 'LG U+',
        email: 'existing@example.com',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'wrongpassword',
      });

      const response = await authHandler(request);
      const data = await response.json();

      // Verify error response
      expect(response.status).toBe(401);
      expect(data.error).toBe('잘못된 비밀번호입니다.');
    });

    it('should return error for missing required fields', async () => {
      // Request with missing required fields
      const request = createTestRequest({
        email: 'incomplete@example.com',
        // Missing carrier, reservationTime, messagePassword
      });

      const response = await authHandler(request);
      const data = await response.json();

      // Verify error response
      expect(response.status).toBe(400);
      expect(data.error).toContain('모든 필수 필드');
    });

    it('should validate email format', async () => {
      // Invalid email format
      const request = createTestRequest({
        carrier: 'SKT',
        email: 'invalid-email',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      });

      const response = await authHandler(request);
      const data = await response.json();

      // Verify error response
      expect(response.status).toBe(400);
      expect(data.error).toContain('유효한 이메일 주소');
    });
  });
});
