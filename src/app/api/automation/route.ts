import { NextResponse } from 'next/server';
import { startAutomation, stopAutomation } from '@/lib/server/automation';

export async function POST() {
  try {
    const results = await startAutomation();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in automation API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start automation' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = await stopAutomation();
    return NextResponse.json({ ...result });
  } catch (error) {
    console.error('Error stopping automation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to stop automation' 
      },
      { status: 500 }
    );
  }
}
