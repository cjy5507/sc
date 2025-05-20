import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';

class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private static instance: BrowserManager;

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  public async launch(options: LaunchOptions = {}) {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await chromium.launch({
      headless: false, // 개발 중에는 false로 설정하여 브라우저를 볼 수 있게 합니다.
      slowMo: 100, // 동작을 천천히 하여 디버깅을 용이하게 합니다.
      ...options,
    });

    return this.browser;
  }

  public async createContext() {
    if (!this.browser) {
      throw new Error('Browser is not launched. Call launch() first.');
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR', // 한국어 로케일 설정
      timezoneId: 'Asia/Seoul', // 한국 시간대 설정
    });

    return this.context;
  }

  public async newPage() {
    if (!this.context) {
      throw new Error('Context is not created. Call createContext() first.');
    }

    this.page = await this.context.newPage();
    return this.page;
  }

  public async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * 현재 컨텍스트만 닫고 브라우저는 유지
   */
  public async closeContext() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  public getPage(): Page | null {
    return this.page;
  }
}

export const browserManager = BrowserManager.getInstance();
