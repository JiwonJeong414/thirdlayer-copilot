// src/app/api/auth/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { email, displayName, photoURL } = await request.json();

    if (!email || !displayName) {
      return NextResponse.json(
        { error: 'Email and display name are required' }, 
        { status: 400 }
      );
    }

    // Upsert user - create if doesn't exist, update if exists
    const user = await prisma.user.upsert({
      where: {
        uid: uid,
      },
      update: {
        email: email,
        displayName: displayName,
        photoURL: photoURL,
        updatedAt: new Date(),
      },
      create: {
        uid: uid,
        email: email,
        displayName: displayName,
        photoURL: photoURL,
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user' }, 
      { status: 500 }
    );
  }
}