import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { IAutomationEngine, AutomationResult, AutomationProgress, StoreConfig } from '../types/automation.types';

export abstract class BaseAutomationEngine implements IAutomationEngine {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected isRunning: boolean = false;
  protected storeConfig: StoreConfig;
  protected progress: AutomationProgress;

  constructor(storeConfig: StoreConfig) {
    this.storeConfig = storeConfig;
    this.progress = {
      storeId: storeConfig.id,
      storeName: storeConfig.name,
      status: 'idle',
      progress: 0,
      currentStep: 'Initializing',
      lastUpdated: new Date(),
    };
  }

  async initialize(): Promise<AutomationResult> {
    try {
      this.updateProgress('Initializing browser');
      this.browser = await chromium.launch({
        headless: false, // 디버깅을 위해 false로 설정, 실제 운영에서는 true로 변경
        slowMo: 50, // 인간과 같은 동작을 위한 지연(ms)
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      });

      this.page = await this.context.newPage();
      await this.page.goto(this.storeConfig.url, { waitUntil: 'networkidle' });
      
      this.updateProgress('Browser initialized', 10);
      return { success: true, message: 'Initialization successful' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during initialization';
      this.updateProgress('Initialization failed', 0, 'failed');
      return { 
        success: false, 
        message: `Initialization failed: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }

  abstract start(): Promise<AutomationResult>;

  async stop(): Promise<AutomationResult> {
    this.isRunning = false;
    this.updateProgress('Stopping automation', this.progress.progress);
    
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      
      this.updateProgress('Stopped', this.progress.progress, 'idle');
      return { success: true, message: 'Automation stopped successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: 'Error while stopping automation',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  getProgress(): Promise<AutomationProgress> {
    return Promise.resolve(this.progress);
  }

  async handleAuth(data: any): Promise<AutomationResult> {
    // 기본 구현 - 하위 클래스에서 오버라이드
    return { success: false, message: 'Auth handling not implemented' };
  }

  protected updateProgress(
    currentStep: string, 
    progress?: number, 
    status?: AutomationProgress['status']
  ): void {
    if (progress !== undefined) this.progress.progress = progress;
    if (status) this.progress.status = status;
    
    this.progress.currentStep = currentStep;
    this.progress.lastUpdated = new Date();
    
    // 여기에 진행 상황을 UI나 로그에 전달하는 로직 추가
    console.log(`[${this.storeConfig.name}] ${currentStep} (${this.progress.progress}%)`);
  }

  // 공통 유틸리티 메서드들
  protected async waitForRandomDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected async humanType(element: any, text: string): Promise<void> {
    if (!this.page) return;
    
    for (const char of text) {
      await element.type(char, { delay: Math.random() * 100 + 50 });
      await this.waitForRandomDelay(10, 100);
    }
  }
}
