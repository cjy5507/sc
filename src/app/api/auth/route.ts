import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT 시크릿 키
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
}

// 로그인 및 회원가입 API
// POST /api/auth
interface AuthRequest {
  carrier: string;
  email: string;
  reservationTime: string;
  messagePassword: string;
}

export async function POST(request: Request) {
  try {
    const { carrier, email, reservationTime, messagePassword } = await request.json() as Partial<AuthRequest>;

    // 필수 필드 검증
    if (!carrier || !email || !reservationTime || !messagePassword) {
      return NextResponse.json(
        { error: '모든 필수 필드(통신사, 이메일, 예약 시간, 메시지 비밀번호)를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 조회 또는 생성
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(messagePassword, 10);

    let userId: number;

    if (!user) {
      // 새 사용자 생성
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: email.split('@')[0], // 이메일 아이디 부분을 이름으로 사용
          phoneNumber: '', // 나중에 업데이트 가능
          carrier,
          password: hashedPassword,
        })
        .returning();
      
      if (!newUser) {
        throw new Error('사용자 생성에 실패했습니다.');
      }
      
      userId = newUser.id;
    } else {
      // 기존 사용자 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(messagePassword, user.password || '');
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '잘못된 비밀번호입니다.' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // 최종 사용자 정보 조회 (최신 데이터)
    const [currentUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phoneNumber: users.phoneNumber,
        carrier: users.carrier,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!currentUser) {
      throw new Error('사용자 정보를 가져오는 중 오류가 발생했습니다.');
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: currentUser.id,
        email: currentUser.email,
        carrier: currentUser.carrier,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 토큰 만료 기간: 7일
    );

    return NextResponse.json({
      success: true,
      token,
      user: currentUser,
    }, { status: 200 });

  } catch (error) {
    console.error('인증 오류:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
