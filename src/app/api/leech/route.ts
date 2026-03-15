import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import crypto from 'crypto';

// Types for the request body
interface LeechRequest {
  url: string;
  filename?: string;
}

export async function POST(request: Request) {
  try {
    const body: LeechRequest = await request.json();
    const { url, filename } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // 1. Generate a unique ID for this leech job
    // Using random bytes for collision avoidance and URL safety
    const docBytes = crypto.randomBytes(8);
    const docId = docBytes.toString('hex'); // 16 characters

    // 2. Create initial document in Firestore
    const db = getAdminFirestore();
    const collectionName = process.env.FIREBASE_COLLECTION_NAME || 'files';
    
    // We store initial metadata so UI can show "Processing..." immediately
    await db.collection(collectionName).doc(docId).set({
      original_url: url,
      filename: filename || 'unknown',
      status: 'pending', // pending -> processing -> completed / failed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Trigger GitHub Actions Workflow via repository_dispatch
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubToken || !repoOwner || !repoName) {
      console.error('Missing GitHub configuration');
      return NextResponse.json(
        { error: 'Server configuration error: GitHub secrets missing' },
        { status: 500 }
      );
    }

    const dispatchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
    
    const response = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'leech_command',
        client_payload: {
          doc_id: docId,
          download_url: url,
          filename: filename,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub Dispatch Error:', response.status, errorText);
      
      // Rollback Firestore entry on failure
      await db.collection(collectionName).doc(docId).delete();

      return NextResponse.json(
        { error: `Failed to trigger workflow: ${response.statusText}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      doc_id: docId,
      message: 'Leech process started',
      status_url: `/api/leech/${docId}/status` // Hypothetical status endpoint
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
