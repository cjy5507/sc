import { StoreConfig } from '@/automation/types/automation.types';
import { playwrightManager } from './playwright';
import type { Page } from 'playwright';
const { timeSync } = require('../../utils/timeSync.cjs');

function getNetworkTime() {
  // timeSync.getStatus()의 offsetMs를 적용한 네트워크 기준 시간 반환
  const offset = timeSync.getStatus().offsetMs || 0;
  return new Date(Date.now() + offset);
}

async function waitUntilTargetTime(targetDate: Date) {
  while (true) {
    const now = getNetworkTime();
    if (now >= targetDate) break;
    await new Promise(res => setTimeout(res, 200));
  }
}

async function waitAndClickLikeHuman(page: Page, selector: string, retryInterval = 1000, maxTries = 0) {
  let tries = 0;
  while (maxTries === 0 || tries < maxTries) {
    try {
      // 요소가 보일 때까지 대기
      await page.waitForSelector(selector, { timeout: 2000 });
      // 마우스 이동(사람처럼)
      const el = await page.$(selector);
      if (el) {
        const box = await el.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
          await page.waitForTimeout(300 + Math.random() * 400);
        }
      }
      // 클릭(사람처럼)
      await page.click(selector, { delay: 100 + Math.random() * 200 });
      return true;
    } catch (e) {
      await page.waitForTimeout(retryInterval + Math.random() * 500);
      tries++;
    }
  }
  return false;
}

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

          // === 정각까지 새로고침/대기 ===
          // 매달 말일 00:00:00을 타겟으로 설정
          const now = getNetworkTime();
          const target = new Date(now);
          target.setMonth(target.getMonth() + 1, 0); // 이번 달의 마지막 날
          target.setHours(0, 0, 0, 0); // 00:00:00
          console.log(`[자동화] ${config.name} - 정각(${target.toLocaleString()})까지 새로고침 반복`);
          while (getNetworkTime() < target) {
            await this.page.reload();
            await new Promise(res => setTimeout(res, 5000)); // 5초마다 새로고침
          }

          // === 정각이 되면 버튼을 계속 찾으면서 클릭 시도 ===
          console.log(`[자동화] ${config.name} - 정각 도달, 예약 버튼 탐색 시작`);
          const found = await waitAndClickLikeHuman(this.page, 'button.rolex-button[name="submit_appointment"]', 1000, 0); // 무한 반복
          if (found) {
            // 패스 인증 등 수동 입력 대기(예: 60초)
            await this.page.waitForTimeout(60000); // 실제로는 사용자 입력 감지 로직 필요
            // 이후 자동화 재개(예: 예약 폼 자동 입력 등)
            results.push({
              success: true,
              storeId: config.id,
              message: `예약 버튼 클릭 성공! (${config.name})`
            });
          } else {
            results.push({
              success: false,
              storeId: config.id,
              message: `예약 버튼을 찾지 못했습니다. (${config.name})`
            });
          }
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
