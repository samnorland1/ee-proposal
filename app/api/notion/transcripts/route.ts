import { NextResponse } from 'next/server';
import { getTranscriptsReadyForProposal } from '@/lib/notion';

export async function GET() {
  try {
    const transcripts = await getTranscriptsReadyForProposal();
    return NextResponse.json({ transcripts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transcripts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
