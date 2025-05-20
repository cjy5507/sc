// Client-side environment variables
export const env = {
  // Public URL (for API calls from the browser)
  publicUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // API base URL (for server-side API calls)
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Playwright settings
  playwright: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    slowMo: parseInt(process.env.PLAYWRIGHT_SLOW_MO || '0'),
    timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000'),
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '10'), // Limit each IP to 10 requests per windowMs
  },
} as const;
