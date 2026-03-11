import { NextResponse } from 'next/server';
import { getAllProposals } from '@/lib/storage';

export async function GET() {
  try {
    const proposals = await getAllProposals();
    return NextResponse.json({ proposals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
