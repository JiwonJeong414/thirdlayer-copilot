import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    console.log('Session cookie:', session ? 'Present' : 'Missing');
    
    if (!session) {
      console.log('No session cookie found');
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    try {
      const sessionData = JSON.parse(session.value);
      console.log('Session data parsed successfully');
      
      if (!sessionData.userId || !sessionData.accessToken) {
        console.log('Invalid session data:', { 
          hasUserId: !!sessionData.userId, 
          hasAccessToken: !!sessionData.accessToken 
        });
        return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
      }

      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { id: sessionData.userId }
      });

      if (!user) {
        console.log('User not found in database:', sessionData.userId);
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      return NextResponse.json({
        accessToken: sessionData.accessToken,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      });
    } catch (parseError) {
      console.error('Error parsing session cookie:', parseError);
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
} 