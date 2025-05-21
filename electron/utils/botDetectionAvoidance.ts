import { Page } from 'playwright';
import { humanDelay } from './timeUtils';

/**
 * 자연스러운 마우스 움직임을 시뮬레이션
 */
export async function moveMouseNaturally(page: Page, selector?: string): Promise<void> {
  try {
    const viewportSize = page.viewportSize();
    if (!viewportSize) return;
    
    // 시작 위치 - 랜덤 위치 사용
    let startX = Math.floor(Math.random() * viewportSize.width * 0.8);
    let startY = Math.floor(Math.random() * viewportSize.height * 0.8);
    
    let targetX, targetY;
    
    if (selector) {
      // 선택된 요소로 이동
      const element = await page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          targetX = box.x + box.width / 2 + (Math.random() * 10 - 5);
          targetY = box.y + box.height / 2 + (Math.random() * 10 - 5);
        } else {
          // 박스를 가져올 수 없는 경우 랜덤 위치로
          targetX = Math.floor(Math.random() * viewportSize.width * 0.8);
          targetY = Math.floor(Math.random() * viewportSize.height * 0.8);
        }
      } else {
        // 요소를 찾을 수 없는 경우 랜덤 위치로
        targetX = Math.floor(Math.random() * viewportSize.width * 0.8);
        targetY = Math.floor(Math.random() * viewportSize.height * 0.8);
      }
    } else {
      // 랜덤 위치로 이동
      targetX = Math.floor(Math.random() * viewportSize.width * 0.8);
      targetY = Math.floor(Math.random() * viewportSize.height * 0.8);
    }
    
    // 부드러운 움직임으로 이동 (여러 단계)
    await page.mouse.move(targetX, targetY, { steps: 15 });
  } catch (error) {
    console.error('마우스 자연스럽게 이동 중 오류:', error);
  }
}

/**
 * 인간과 같은 클릭을 시뮬레이션
 */
export async function humanClick(page: Page, selector: string): Promise<boolean> {
  try {
    // 요소가 보이는지 확인
    const element = await page.waitForSelector(selector, {
      state: 'visible',
      timeout: 5000
    });
    
    if (!element) return false;
    
    // 요소의 바운딩 박스 가져오기
    const box = await element.boundingBox();
    if (!box) return false;
    
    // 자연스러운 랜덤 위치에 마우스 이동 (요소 중앙 기준)
    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
    
    // 여러 단계로 마우스 이동 (더 자연스러운 움직임)
    await page.mouse.move(x, y, { steps: 10 });
    
    // 짧은 지연
    await page.waitForTimeout(Math.floor(Math.random() * 300) + 50);
    
    // 마우스 다운 및 업 (클릭)
    await page.mouse.down();
    await page.waitForTimeout(Math.floor(Math.random() * 100) + 20);
    await page.mouse.up();
    
    return true;
  } catch (error) {
    console.error('인간처럼 클릭 중 오류:', error);
    return false;
  }
} 