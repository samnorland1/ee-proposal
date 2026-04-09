import { NextResponse } from 'next/server';

// Ping webhook endpoint to keep it warm and prevent cold start timeouts
export async function GET() {
  const webhookUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/webhooks/vollna`
    : 'https://proposal-app-nine.vercel.app/api/webhooks/vollna';

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'keep-warm' }),
    });

    return NextResponse.json({
      success: true,
      status: res.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
