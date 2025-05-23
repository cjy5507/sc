import { Store, StoreConfig } from '../types';

export const DEFAULT_CONFIG: StoreConfig = {
  name: process.env.USER_NAME || '홍길동',
  phone: process.env.USER_PHONE || '01012345678',
  message: process.env.USER_MESSAGE || '롤렉스 데이토나 모델에 관심이 있습니다. 매장 방문 예약을 원합니다.',
  carrier: process.env.USER_CARRIER || 'SKT', // SKT, KT, LGU
  testMode: process.env.TEST_MODE === 'true',
  email: 'rolex@rolex.com'
};

/**
 * 스토어 목록
 */
const STORES: Store[] = [
  {
    id: 'store1',
    name: '롤렉스 매장 1',
    url: 'https://www.rolex.com',
    config: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'user@example.com'
    }
  },
  {
    id: 'store2',
    name: '롤렉스 매장 2',
    url: 'https://www.rolex.com/ko',
    config: {
      name: '김철수',
      phone: '010-8765-4321',
      email: 'user2@example.com'
    }
  }
];

// CommonJS 방식으로 내보내기
module.exports = { STORES }; 