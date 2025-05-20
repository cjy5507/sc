import { NextResponse } from 'next/server';
// import { startAutomation, stopAutomation } from '@/lib/server/automation';

export async function GET(req: Request) {
  return new Response(JSON.stringify({ message: '자동화 API는 Electron 환경에서만 동작합니다.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  return new Response(JSON.stringify({ message: '자동화 API는 Electron 환경에서만 동작합니다.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ message: '자동화 API는 Electron 환경에서만 동작합니다.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
