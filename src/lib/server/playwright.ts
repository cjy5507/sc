import { chromium, Browser, BrowserContext, Page } from 'playwright';

class PlaywrightManager {
  private static instance: PlaywrightManager;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  public static getInstance(): PlaywrightManager {
    if (!PlaywrightManager.instance) {
      PlaywrightManager.instance = new PlaywrightManager();
    }
    return PlaywrightManager.instance;
  }

  public async getPage(): Promise<Page> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    if (!this.context) {
      this.context = await this.browser.newContext();
    }

    if (!this.page) {
      this.page = await this.context.newPage();
    }

    return this.page;
  }

  public async close() {
    if (this.page) {
      await this.page.close().catch(console.error);
      this.page = null;
    }

    if (this.context) {
      await this.context.close().catch(console.error);
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(console.error);
      this.browser = null;
    }
  }
}

export const playwrightManager = PlaywrightManager.getInstance();

// Cleanup on process exit
process.on('beforeExit', async () => {
  await playwrightManager.close();
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await playwrightManager.close();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await playwrightManager.close();
  process.exit(1);
});
