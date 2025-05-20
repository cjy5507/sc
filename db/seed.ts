import { db } from './index';
import { stores, watchModels, users, reservations, reservationStatusEnum } from './schema';
import { sql } from '@vercel/postgres';

async function main() {
  console.log('🌱 시드 데이터 생성 시작...');

  // 기존 데이터 삭제
  console.log('기존 데이터 삭제 중...');
  await sql`DELETE FROM reservations`;
  await sql`DELETE FROM watch_models`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM stores`;

  // 매장 데이터 삽입
  console.log('매장 데이터 삽입 중...');
  const storeData = [
    {
      name: '롯데 명동',
      address: '서울특별시 중구 남대문로 81',
      phoneNumber: '02-771-2500',
      description: '롯데백화점 명동점 내 롤렉스 매장',
      reservationUrl: 'https://www.chronodigmwatch.co.kr/rolex/contact-seoul/',
    },
    {
      name: '현대 판교',
      address: '경기도 성남시 분당구 판교역로 146',
      phoneNumber: '031-5170-2233',
      description: '현대백화점 판교점 내 롤렉스 매장',
      reservationUrl: 'https://www.unopangyo.com/rolex/contact-gyeonggi/',
    },
    {
      name: '현대 무역',
      address: '서울특별시 강남구 테헤란로 517',
      phoneNumber: '02-552-2233',
      description: '현대백화점 무역센터점 내 롤렉스 매장',
      reservationUrl: 'https://www.hyundaiwatch.co.kr/rolex/contact-seoul/',
    },
    {
      name: '롯데 서면',
      address: '부산광역시 부산진구 가야대로 772',
      phoneNumber: '051-810-2500',
      description: '롯데백화점 서면점 내 롤렉스 매장',
      reservationUrl: 'https://www.hongbowatch.co.kr/rolex/contact-busan/',
    },
  ];

  const insertedStores = await Promise.all(
    storeData.map(async (store) => {
      const result = await db.insert(stores).values(store).returning();
      return result[0];
    })
  );

  // 시계 모델 데이터 삽입
  console.log('시계 모델 데이터 삽입 중...');
  const watchModelData = [
    // 강남점 시계
    {
      storeId: insertedStores[0].id,
      name: '데이토나',
      reference: '116500LN',
      description: '롤렉스 데이토나 블랙 다이얼 세라믹 베젤',
      price: 18500000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m116500ln-0001.png',
    },
    {
      storeId: insertedStores[0].id,
      name: '데이토나 - 플래티넘',
      reference: '116506',
      description: '롤렉스 데이토나 아이스블루 다이얼 플래티넘',
      price: 75000000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m116506-0001.png',
    },
    // 명동점 시계
    {
      storeId: insertedStores[1].id,
      name: '서브마리너 - 블루',
      reference: '126613LB',
      description: '롤렉스 서브마리너 데이트 블루 다이얼 옐로우 골드 & 오이스터스틸',
      price: 21000000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126613lb-0002.png',
    },
    {
      storeId: insertedStores[1].id,
      name: '서브마리너 - 블랙',
      reference: '124060',
      description: '롤렉스 서브마리너 블랙 다이얼 오이스터스틸',
      price: 12000000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m124060-0001.png',
    },
    // 부산점 시계
    {
      storeId: insertedStores[2].id,
      name: 'GMT 마스터 II - 펩시',
      reference: '126710BLRO',
      description: '롤렉스 GMT 마스터 II 블루 & 레드 베젤 오이스터스틸',
      price: 14500000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126710blro-0001.png',
    },
    {
      storeId: insertedStores[2].id,
      name: 'GMT 마스터 II - 배트맨',
      reference: '126710BLNR',
      description: '롤렉스 GMT 마스터 II 블루 & 블랙 베젤 오이스터스틸',
      price: 14500000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126710blnr-0002.png',
    },
    // 대구점 시계
    {
      storeId: insertedStores[3].id,
      name: '데이저스트 41',
      reference: '126334',
      description: '롤렉스 데이저스트 41 블루 다이얼 오이스터스틸 & 화이트 골드',
      price: 12000000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126334-0001.png',
    },
    {
      storeId: insertedStores[3].id,
      name: '데이저스트 36',
      reference: '126200',
      description: '롤렉스 데이저스트 36 실버 다이얼 오이스터스틸',
      price: 9500000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126200-0001.png',
    },
    // 인천점 시계
    {
      storeId: insertedStores[4].id,
      name: '익스플로러 I',
      reference: '124270',
      description: '롤렉스 익스플로러 I 블랙 다이얼 오이스터스틸',
      price: 9500000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m124270-0001.png',
    },
    {
      storeId: insertedStores[4].id,
      name: '익스플로러 II',
      reference: '226570',
      description: '롤렉스 익스플로러 II 화이트 다이얼 오이스터스틸',
      price: 11000000,
      isAvailable: true,
      imageUrl: 'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m226570-0001.png',
    },
  ];

  const insertedWatchModels = await Promise.all(
    watchModelData.map(async (watchModel) => {
      const result = await db.insert(watchModels).values(watchModel).returning();
      return result[0];
    })
  );

  // 사용자 데이터 삽입
  console.log('사용자 데이터 삽입 중...');
  const userData = [
    {
      clerkId: 'user_1',
      email: 'user1@example.com',
      name: '홍길동',
      phoneNumber: '010-1234-5678',
    },
    {
      clerkId: 'user_2',
      email: 'user2@example.com',
      name: '김철수',
      phoneNumber: '010-2345-6789',
    },
    {
      clerkId: 'user_3',
      email: 'user3@example.com',
      name: '이영희',
      phoneNumber: '010-3456-7890',
    },
  ];

  const insertedUsers = await Promise.all(
    userData.map(async (user) => {
      const result = await db.insert(users).values(user).returning();
      return result[0];
    })
  );

  // 예약 데이터 삽입
  console.log('예약 데이터 삽입 중...');
  const reservationData = [
    {
      userId: insertedUsers[0].id,
      storeId: insertedStores[0].id,
      watchModelId: insertedWatchModels[1].id,
      status: reservationStatusEnum.enumValues[1], // '완료'
      reservationDate: new Date('2025-05-18T14:00:00'),
      notes: '데이토나 플래티넘 모델 예약',
    },
    {
      userId: insertedUsers[1].id,
      storeId: insertedStores[1].id,
      watchModelId: insertedWatchModels[2].id,
      status: reservationStatusEnum.enumValues[1], // '완료'
      reservationDate: new Date('2025-05-15T11:30:00'),
      notes: '서브마리너 블루 모델 예약',
    },
    {
      userId: insertedUsers[2].id,
      storeId: insertedStores[2].id,
      watchModelId: insertedWatchModels[4].id,
      status: reservationStatusEnum.enumValues[0], // '대기'
      reservationDate: new Date('2025-05-12T16:00:00'),
      notes: 'GMT 마스터 II 폭시 모델 예약',
    },
  ];

  await Promise.all(
    reservationData.map(async (reservation) => {
      await db.insert(reservations).values(reservation);
    })
  );

  console.log('✅ 시드 데이터 생성 완료!');
}

main()
  .catch((e) => {
    console.error('시드 데이터 생성 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    // 연결 종료
    await sql.end();
    process.exit(0);
  });
