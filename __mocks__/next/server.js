// Mock for next/server
const mockNextResponse = {
  json: jest.fn().mockImplementation((data) => ({
    ...data,
    headers: { get: () => 'application/json' },
  })),
  status: jest.fn().mockReturnThis(),
};

module.exports = {
  NextResponse: {
    json: mockNextResponse.json,
    status: jest.fn().mockReturnValue(mockNextResponse),
  },
  NextRequest: class {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(
        Object.entries(init.headers || { 'Content-Type': 'application/json' })
      );
      this.body = init.body;
      this.json = async () => JSON.parse(this.body || '{}');
    }
  },
};
