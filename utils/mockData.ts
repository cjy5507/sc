/**
 * 개발 및 테스트용 목업 데이터
 */
import { IClientStore, IUser, IReservationProfile } from '../types/index';

// 매장 목업 데이터
export const stores: IClientStore[] = [
  {
    id: 'chronodime',
    name: '크로노다임',
    displayName: '롯데 명동 (크로노다임)',
    url: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/appointment/',
    selectors: {
      purposeCard: '.fappointment .purpose-card',
      dateSelector: '.date-selector',
      timeSelector: '.time-slot',
      agreementCheckbox: '.agreement-checkbox',
      submitButton: '.submit-button',
    },
  },
  {
    id: 'unopangyo',
    name: '우노와치',
    displayName: '현대 판교 (우노와치)',
    url: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    selectors: {
      purposeCard: '.booking-wrapper .booking-option',
      dateSelector: '.date-picker',
      timeSelector: '.time-option',
      agreementCheckbox: '.terms-checkbox',
      submitButton: '.submit-btn',
    },
  },
  {
    id: 'hyundaiwatch',
    name: '현대시계',
    displayName: '현대 무역 (현대시계)',
    url: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/appointment/',
    selectors: {
      purposeCard: '.appointment-section .appointment-choice',
      dateSelector: '.calendar-selector',
      timeSelector: '.time-selector',
      agreementCheckbox: '.agreement-check',
      submitButton: '.submit-appointment',
    },
  },
  {
    id: 'hongbowatch',
    name: '홍보시계',
    displayName: '롯데 서면 (홍보시계)',
    url: 'https://www.hongbowatch.co.kr/rolex/contact-busan/appointment/',
    selectors: {
      purposeCard: '.booking-container .booking-card',
      dateSelector: '.date-container',
      timeSelector: '.time-slot',
      agreementCheckbox: '.agreement-box',
      submitButton: '.confirm-button',
    },
  },
];

// 목업 사용자 데이터
export const mockUser: IUser = {
  id: 'user_1',
  email: 'user@example.com',
  name: '홍길동',
  phone: '010-1234-5678',
  createdAt: new Date('2025-01-01'),
  lastActivity: new Date(),
};

// 목업 예약 프로필 데이터
export const mockReservationProfile: IReservationProfile = {
  id: 'profile_1',
  userId: 'user_1',
  defaultInfo: {
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'user@example.com',
  },
  storePreferences: [
    {
      storeId: 'chronodime',
      enabled: true,
      purpose: '구매 상담',
      priority: 1,
    },
    {
      storeId: 'unopangyo',
      enabled: true,
      purpose: '구매 상담',
      priority: 2,
    },
    {
      storeId: 'hyundaiwatch',
      enabled: true,
      purpose: '구매 상담',
      priority: 3,
    },
    {
      storeId: 'hongbowatch',
      enabled: true,
      purpose: '구매 상담',
      priority: 4,
    },
  ],
};
