import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  try {
    const url = getAuthUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
} 