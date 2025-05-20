import { StoreConfig } from '@/automation/types/automation.types';
import { playwrightManager } from './playwright';

class ServerAutomationManager {
  private isRunning: boolean = false;
  private page: any = null;

  constructor(private storeConfigs: StoreConfig[]) {}

  async startAll() {
    if (this.isRunning) {
      return [{ success: false, message: 'Automation is already running' }];
    }

    this.isRunning = true;
    const results = [];

    try {
      this.page = await playwrightManager.getPage();

      for (const config of this.storeConfigs) {
        if (!config.enabled) continue;

        try {
          console.log(`Starting automation for store: ${config.name}`);
          await this.page.goto(config.url, { waitUntil: 'networkidle' });
          
          // Add your store-specific automation logic here
          // For example:
          // await this.page.fill('input[name="name"]', 'Your Name');
          // await this.page.click('button[type="submit"]');
          
          results.push({
            success: true,
            storeId: config.id,
            message: `Automation started for ${config.name}`
          });
        } catch (error) {
          console.error(`Error automating ${config.name}:`, error);
          results.push({
            success: false,
            storeId: config.id,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    } catch (error) {
      console.error('Error in automation:', error);
      throw error;
    } finally {
      await this.cleanup();
    }

    return results;
  }

  async stopAll() {
    this.isRunning = false;
    await this.cleanup();
    return [{ success: true, message: 'Automation stopped' }];
  }

  private async cleanup() {
    // We don't close the page here as it's managed by the PlaywrightManager
    this.page = null;
  }
}

export async function startAutomation() {
  const storeConfigs: StoreConfig[] = [
    {
      id: 'chronodigm',
      name: '롯데 명동 (크로노다임)',
      url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
      enabled: true,
      priority: 1,
      purpose: '롤렉스 시계 구매 상담'
    },
    {
      id: 'unopangyo',
      name: '현대 판교 (우노와치)',
      url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
      enabled: true,
      priority: 2,
      purpose: '롤렉스 시계 구매 상담'
    }
  ];

  const manager = new ServerAutomationManager(storeConfigs);
  return manager.startAll();
}

export async function stopAutomation() {
  // In a real implementation, you would track and stop running automations
  return { success: true, message: 'Automation stopped' };
}
