// STEP 1: Debug the Drive permissions issue

// src/app/api/drive/debug/route.ts - NEW FILE to debug permissions
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { google } from 'googleapis';

interface QueryResult {
  count?: number;
  files?: Array<{ name: string; mimeType: string; id: string }>;
  error?: string;
}

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driveConnection: true,
      },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken,
    });

    // Test 1: Check token info
    console.log('🔍 Testing token permissions...');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const tokenInfo = await oauth2.tokeninfo({
      access_token: user.driveConnection.accessToken
    });

    console.log('Token info:', {
      scope: tokenInfo.data.scope,
      audience: tokenInfo.data.audience,
      expires_in: tokenInfo.data.expires_in
    });

    // Test 2: Check user info
    const userInfo = await oauth2.userinfo.get();
    console.log('User info:', {
      email: userInfo.data.email,
      name: userInfo.data.name
    });

    // Test 3: Try Drive API with different queries
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Test 3a: Get user's Drive info
    const aboutResponse = await drive.about.get({
      fields: 'user, storageQuota'
    });
    console.log('Drive about:', {
      user: aboutResponse.data.user,
      quota: aboutResponse.data.storageQuota
    });

    // Test 3b: Try different file queries
    const queries = [
      { name: 'All files', q: undefined },
      { name: 'Non-trashed', q: 'trashed=false' },
      { name: 'Google Docs only', q: "mimeType='application/vnd.google-apps.document' and trashed=false" },
      { name: 'Recent files', q: 'trashed=false', orderBy: 'modifiedTime desc' },
    ];

    const results: Record<string, QueryResult> = {};
    for (const query of queries) {
      try {
        const response = await drive.files.list({
          pageSize: 10,
          fields: 'files(id, name, mimeType, parents)',
          q: query.q,
          orderBy: query.orderBy,
        });
        
        results[query.name] = {
          count: response.data.files?.length || 0,
          files: response.data.files?.slice(0, 3).map(f => ({
            name: f.name || '',
            mimeType: f.mimeType || '',
            id: f.id || ''
          })) || []
        };
        
        console.log(`${query.name}: Found ${response.data.files?.length || 0} files`);
      } catch (error) {
        results[query.name] = { error: error instanceof Error ? error.message : String(error) };
        console.error(`${query.name} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    return NextResponse.json({
      success: true,
      tokenInfo: {
        scope: tokenInfo.data.scope || '',
        expires_in: tokenInfo.data.expires_in,
        email: userInfo.data.email,
      },
      driveInfo: aboutResponse.data,
      fileQueries: results,
      diagnosis: getDiagnosis(tokenInfo.data.scope || '', results)
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getDiagnosis(scope: string, results: any): string[] {
  const issues = [];
  
  if (!scope) {
    issues.push("❌ No scope information available");
  } else {
    if (!scope.includes('drive')) {
      issues.push("❌ Missing Google Drive scopes in token");
    }
    if (scope.includes('drive.file') && !scope.includes('drive.readonly')) {
      issues.push("⚠️  Token only has drive.file scope (limited access)");
    }
  }
  
  if (results['All files']?.count === 0 && results['Non-trashed']?.count === 0) {
    issues.push("❌ Cannot access any files - likely a permissions issue");
  }
  
  if (results['Google Docs only']?.count > 0 && results['All files']?.count === 0) {
    issues.push("⚠️  Can access some files but not all - scope limitation");
  }
  
  if (issues.length === 0) {
    issues.push("✅ Drive access appears to be working");
  }
  
  return issues;
}
