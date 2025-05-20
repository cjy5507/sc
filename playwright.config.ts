import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000, // 테스트 타임아웃을 60초로 증가
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: false, // 병렬 실행 비활성화 (PASS 인증 테스트를 위해)
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // 로컬에서도 1회 재시도
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000', // 로컬 개발 서버를 기본 URL로 설정

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshot after each test failure */
    screenshot: 'only-on-failure',
    /* Video recording for failed tests */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // 고정된 뷰포트 크기
        launchOptions: {
          slowMo: process.env.CI ? 0 : 100, // CI에서는 느린 모션 비활성화, 로컬에서는 100ms 지연
          headless: process.env.CI ? true : false // CI에서만 헤드리스 모드로 실행
        },
        permissions: ['geolocation', 'notifications'], // 위치 및 알림 권한 요청
        locale: 'ko-KR', // 한국어 로케일 설정
        timezoneId: 'Asia/Seoul' // 서울 시간대 설정
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
