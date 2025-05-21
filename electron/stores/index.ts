import { Store, Config } from '../types';

export const DEFAULT_CONFIG: Config = {
  name: process.env.USER_NAME || '홍길동',
  phone: process.env.USER_PHONE || '01012345678',
  message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 예약을 원합니다.',
  carrier: process.env.USER_CARRIER || 'SKT', // SKT, KT, LGU
  testMode: process.env.TEST_MODE === 'true',
  email: 'rolex@rolex.com'
};

export const STORES: Store[] = [
  { id: 'chronodigm', name: '크로노다임', url: 'https://www.chronodigmwatch.co.kr/rolex/', config: DEFAULT_CONFIG },
  { id: 'unopangyo', name: '우노판교', url: 'https://www.unopangyo.com/rolex/', config: DEFAULT_CONFIG },
  { id: 'hyundai', name: '현대', url: 'https://www.hyundaiwatch.co.kr/rolex/', config: DEFAULT_CONFIG },
  { id: 'hongbo', name: '홍보', url: 'https://www.hongbowatch.co.kr/rolex/', config: DEFAULT_CONFIG },
]; 