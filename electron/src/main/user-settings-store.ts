import ElectronStore from 'electron-store';

// 타입 정의 (필요시 types 폴더로 분리 가능)
export interface IUserProfile {
  name: string;
  email: string;
  phone: string;
  // TODO: 예약에 필요한 추가 필드 정의
}

export interface IReservationProfile {
  storePreferences: string[]; // 매장 ID 우선순위
  watchInterests: string[];
  appointmentPurpose: string;
  storeSpecificSettings?: Record<string, any>;
}

interface ISettingsSchema {
  userProfile?: IUserProfile;
  reservationProfile?: IReservationProfile;
}

const store = new ElectronStore<ISettingsSchema>({
  name: 'user-settings',
  // 암호화, 검증 옵션은 이후 단계에서 추가
});

export function saveUserProfile(profile: IUserProfile) {
  (store as any).set('userProfile', profile);
}

export function getUserProfile(): IUserProfile | undefined {
  return (store as any).get('userProfile');
}

export function saveReservationProfile(profile: IReservationProfile) {
  (store as any).set('reservationProfile', profile);
}

export function getReservationProfile(): IReservationProfile | undefined {
  return (store as any).get('reservationProfile');
} 