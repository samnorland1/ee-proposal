import { NextRequest, NextResponse } from 'next/server';
import { getProposalById, createProposal } from '@/lib/storage';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const proposal = await getProposalById(id);
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const now = new Date().toISOString();
    const duplicate = await createProposal({
      ...proposal,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      clientName: `${proposal.clientName} (Copy)`,
      notionPageId: '',
      notionUrl: '',
    });

    return NextResponse.json({ proposal: duplicate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Duplicate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
