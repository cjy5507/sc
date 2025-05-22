import { NextRequest } from 'next/server';
import { POST as authHandler } from '../route';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

// Mock the database module
jest.mock('@/db', () => {
  const originalModule = jest.requireActual('@/db');
  const mockDb = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };
  
  return {
    ...originalModule,
    db: mockDb,
  };
});

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth API', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedJwt.sign.mockReturnValue('mocked-jwt-token' as any);
    
    // Reset database mocks
    const mockDb = require('@/db').db;
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.eq.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{ id: 1 }]);
  });

  describe('POST /api/auth', () => {
    it('should register a new user with valid data', async () => {
      const testUser = {
        carrier: 'SKT',
        email: 'test@example.com',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      };

      // Mock the request
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      // Execute the handler
      const response = await authHandler(req);
      const data = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.carrier).toBe(testUser.carrier);
      
      // Verify database interactions
      const mockDb = require('@/db').db;
      expect(mockDb.insert).toHaveBeenCalledWith(users);
      expect(mockDb.values).toHaveBeenCalledWith({
        email: testUser.email,
        name: testUser.email.split('@')[0],
        phoneNumber: '',
        carrier: testUser.carrier,
        password: 'hashed-password',
      });
    });

    it('should login an existing user with correct credentials', async () => {
      const testUser = {
        carrier: 'SKT',
        email: 'existing@example.com',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      };

      // Mock database response for existing user
      const mockDb = require('@/db').db;
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.eq.mockReturnThis();
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 1,
          email: testUser.email,
          name: 'Existing User',
          carrier: testUser.carrier,
          password: 'hashed-password',
        },
      ]);

      // Mock the request
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      // Execute the handler
      const response = await authHandler(req);
      const data = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      
      // Verify bcrypt was called with the correct password
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        testUser.messagePassword,
        'hashed-password'
      );
    });

    it('should return an error for invalid email format', async () => {
      const invalidUser = {
        carrier: 'SKT',
        email: 'invalid-email',
        reservationTime: '2023-12-31T23:59:59Z',
        messagePassword: 'test1234',
      };

      // Mock the request
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidUser),
      });

      // Execute the handler
      const response = await authHandler(req);
      const data = await response.json();

      // Verify the error response
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('유효한 이메일 주소');
    });

    it('should return an error for missing required fields', async () => {
      const incompleteUser = {
        // Missing carrier and reservationTime
        email: 'test@example.com',
        messagePassword: 'test1234',
      };

      // Mock the request
      const req = new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteUser),
      });

      // Execute the handler
      const response = await authHandler(req);
      const data = await response.json();

      // Verify the error response
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('모든 필수 필드');
    });
  });
});
