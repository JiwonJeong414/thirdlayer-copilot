// Check if user is authenticated and return their info
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Get user from database
    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Return user info without sensitive data
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ user: null });
  }
} 