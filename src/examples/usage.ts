import { IReservationProfile, IAppSettings } from '../types/settings';
import { 
  reservationProfileSchema, 
  appSettingsSchema,
  validateWithSchema 
} from '../utils/validation';

// 예제 데이터 생성
const exampleProfile: Partial<IReservationProfile> = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '123e4567-e89b-12d3-a456-426614174000',
  storePreferences: [
    {
      storeId: 'store-1',
      name: '롤렉스 강남점',
      isFavorite: true,
      lastVisited: new Date()
    }
  ],
  watchInterests: [
    {
      model: 'Submariner',
      referenceNumber: '126610LN',
      interestLevel: 'high',
      notes: '블랙 베젤 선호'
    }
  ],
  appointmentPurpose: 'purchase',
  storeSpecificSettings: {
    'store-1': {
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      language: 'ko-KR',
      timezone: 'Asia/Seoul',
      theme: 'dark'
    }
  }
};

// 애플리케이션 설정 예제
const exampleAppSettings: Partial<IAppSettings> = {
  version: '1.0.0',
  firstRun: true,
  analyticsEnabled: true
};

// 유효성 검사 실행
const profileValidation = validateWithSchema(reservationProfileSchema, exampleProfile);
const settingsValidation = validateWithSchema(appSettingsSchema, exampleAppSettings);

// 결과 출력
console.log('프로필 유효성 검사:', profileValidation.success ? '성공' : '실패');
if (!profileValidation.success) {
  console.error('에러:', profileValidation.error);
} else {
  console.log('유효한 프로필 데이터:', profileValidation.data);
}

console.log('\n설정 유효성 검사:', settingsValidation.success ? '성공' : '실패');
if (!settingsValidation.success) {
  console.error('에러:', settingsValidation.error);
} else {
  console.log('유효한 설정 데이터:', settingsValidation.data);
}
