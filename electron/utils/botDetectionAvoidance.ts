import { Page } from 'playwright';
import { humanDelay } from './timeUtils';

/**
 * 자연스러운 마우스 움직임을 시뮬레이션
 */
export async function moveMouseNaturally(page: Page, selector: string): Promise<boolean> {
  try {
    const targetElem = await page.$(selector);
    if (!targetElem) {
      console.log(`선택자 ${selector}에 해당하는 요소를 찾지 못했습니다.`);
      return false;
    }
    
    // 요소의 중심 좌표 가져오기
    const box = await targetElem.boundingBox();
    if (!box) return false;
    
    // 현재 마우스 위치를 중앙으로 가정 (실제로는 알 수 없음)
    const viewportSize = page.viewportSize();
    if (!viewportSize) return false;
    
    // 여러 중간 지점을 통해 마우스 부드럽게 이동
    const points = 5;
    const startX = viewportSize.width / 2;
    const startY = viewportSize.height / 2;
    const endX = box.x + box.width / 2;
    const endY = box.y + box.height / 2;
    
    // 마우스 경로에 약간의 변동성 추가
    for (let i = 0; i <= points; i++) {
      const ratio = i / points;
      // 베지어 커브 효과를 내기 위한 변동성 추가
      const offsetX = Math.sin(ratio * Math.PI) * (Math.random() * 30 - 15);
      const offsetY = Math.sin(ratio * Math.PI) * (Math.random() * 30 - 15);
      
      const x = startX + (endX - startX) * ratio + offsetX;
      const y = startY + (endY - startY) * ratio + offsetY;
      
      await page.mouse.move(x, y);
      await humanDelay(50, 150); // 이동 중 짧은 지연
    }
    
    return true;
  } catch (err) {
    console.error('마우스 움직임 시뮬레이션 중 오류:', err);
    return false;
  }
}

/**
 * 인간과 같은 클릭을 시뮬레이션
 */
export async function humanClick(
  page: Page, 
  selector: string, 
  options = { timeout: 5000 }
): Promise<boolean> {
  try {
    // 요소가 존재하는지 확인
    const exists = await page.waitForSelector(selector, { 
      state: 'visible', 
      timeout: options.timeout 
    }).then(() => true).catch(() => false);
    
    if (!exists) {
      console.log(`요소가 존재하지 않음: ${selector}`);
      return false;
    }
    
    // 자연스럽게 마우스 이동
    const moveSuccess = await moveMouseNaturally(page, selector);
    if (!moveSuccess) return false;
    
    // 클릭 전 짧은 지연 추가
    await humanDelay(200, 500);
    
    // 클릭
    await page.click(selector, { delay: Math.floor(Math.random() * 50) + 50 });
    
    // 클릭 후 짧은 지연
    await humanDelay(300, 700);
    
    return true;
  } catch (err) {
    console.error(`인간 클릭 실패 (${selector}):`, err);
    return false;
  }
} 