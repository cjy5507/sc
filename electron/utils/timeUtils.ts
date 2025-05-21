import { StoreConfig } from '../types';

/**
 * 자정까지 대기하는 함수
 */
export async function waitUntilMidnight(config: StoreConfig): Promise<void> {
  const now = new Date();
  
  // 테스트 모드일 경우 대기 시간을 짧게 유지
  if (config.testMode) {
    console.log('테스트 모드: 자정 대기를 10초로 단축합니다.');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 테스트 모드에서는 10초만 대기
    return;
  }
  
  // 자정 계산 및 대기
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  if (timeUntilMidnight > 0) {
    console.log(`자정까지 ${Math.floor(timeUntilMidnight / 1000 / 60)} 분 ${Math.floor(timeUntilMidnight / 1000) % 60} 초 대기합니다.`);
    await new Promise(resolve => setTimeout(resolve, timeUntilMidnight));
  }
}

/**
 * 지정된 범위 내에서 랜덤한 시간만큼 대기하는 함수
 * @param minMs 최소 대기 시간 (ms)
 * @param maxMs 최대 대기 시간 (ms)
 * @returns Promise<void>
 */
export async function humanDelay(minMs = 500, maxMs = 1000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 현재 시간이 매월 말일인지 확인하는 함수
 * @returns boolean
 */
export function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // 내일이 다음 달의 1일이면 오늘은 이번 달의 마지막 날
  return tomorrow.getDate() === 1;
}

/**
 * 현재 시간이 자정(00:00:00)에 근접한지 확인하는 함수
 * @param thresholdSeconds 자정으로부터의 임계값(초)
 * @returns boolean
 */
export function isNearMidnight(thresholdSeconds = 5): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // 자정 또는 자정에 가까운 시간인지 확인
  if (hours === 0 && minutes === 0 && seconds < thresholdSeconds) {
    return true;
  }
  
  // 자정 직전인지 확인 (23:59:xx)
  if (hours === 23 && minutes === 59 && seconds > (60 - thresholdSeconds)) {
    return true;
  }
  
  return false;
} 