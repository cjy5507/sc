import { Config } from '../types';

/**
 * 자정까지 대기하는 함수
 */
export async function waitUntilMidnight(config: Config): Promise<void> {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const isLastDayOfMonth = now.getDate() === lastDayOfMonth.getDate();
  
  // 테스트 모드일 경우 매월 말일 체크를 건너뜁니다.
  if (config.testMode) {
    console.log('테스트 모드: 자정 대기를 10초로 단축합니다.');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 테스트 모드에서는 10초만 대기
    return;
  }
  
  // 테스트 모드가 아닐 경우에만 말일 체크
  if (!isLastDayOfMonth) {
    throw new Error('매월 말일에만 예약이 가능합니다.');
  }

  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  if (timeUntilMidnight > 0) {
    console.log(`자정까지 ${Math.floor(timeUntilMidnight / 1000 / 60)} 분 ${Math.floor(timeUntilMidnight / 1000) % 60} 초 대기합니다.`);
    await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));
  }
}

/**
 * 인간과 같은 딜레이를 시뮬레이션
 */
export async function humanDelay(min = 500, max = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
} 