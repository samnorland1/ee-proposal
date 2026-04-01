import { NextRequest, NextResponse } from 'next/server';
import { getProposalsByClientId } from '@/lib/clients';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposals = await getProposalsByClientId(id);
    return NextResponse.json({ proposals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
