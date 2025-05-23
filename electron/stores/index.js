"use strict";

/**
 * 스토어 목록
 */
const STORES = [
  {
    id: 'chronodigm',
    name: '롯데 명동 (크로노디그마)',
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
    config: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'user@example.com',
      message: '예약 문의 드립니다.'
    }
  },
  {
    id: 'unopangyo',
    name: '현대 판교 (우노와치)',
    url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    config: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'user@example.com',
      message: '예약 문의 드립니다.'
    }
  },
  {
    id: 'hyundaiwatch',
    name: '현대 무역 (현대시계)',
    url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/appointment/',
    config: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'user@example.com',
      message: '예약 문의 드립니다.'
    }
  },
  {
    id: 'hongbowatch',
    name: '롯데 서면 (홍보시계)',
    url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/appointment/',
    config: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'user@example.com',
      message: '예약 문의 드립니다.'
    }
  }
];

// CommonJS 방식으로 내보내기
module.exports = { STORES }; 